/**
 * Requeues OutboxEvent rows that are permanently stuck in `FAILED` status
 * (hit `MAX_ATTEMPTS = 3` in outboxService.ts, so the normal poller —
 * which only claims `status = 'PENDING'` — will never pick them up again)
 * specifically because they failed with the PgBouncer transaction-mode
 * pooler error ("Transaction already closed: Could not perform operation" /
 * "Transaction API error"). That root cause is fixed as of this commit —
 * webhookService.ts / signatureService.ts / authService.ts /
 * reputationService.ts now run their `$transaction(...)` blocks on
 * `prismaDirect` (DIRECT_URL) instead of the pooled `prisma` client. See
 * packages/database/src/index.ts for why.
 *
 * This only resets events whose `lastError` matches that known signature —
 * NOT every FAILED event — so a genuinely bad/malformed event (bad args,
 * a real application bug) doesn't get silently retried forever and doesn't
 * get masked by this script.
 *
 * Usage:
 *   pnpm --filter @repo/api requeue:failed-tx-events            # dry run (default)
 *   pnpm --filter @repo/api requeue:failed-tx-events -- --apply # actually requeue
 */
import { prisma } from "../lib/prisma";

const POOLER_ERROR_SIGNATURES = [
  "Transaction already closed",
  "Transaction API error",
];

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");

  const candidates = await prisma.outboxEvent.findMany({
    where: {
      status: "FAILED",
      OR: POOLER_ERROR_SIGNATURES.map((s) => ({
        lastError: { contains: s },
      })),
    },
    select: {
      id: true,
      eventName: true,
      txHash: true,
      logIndex: true,
      attempts: true,
      lastError: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (candidates.length === 0) {
    console.log(
      "[REQUEUE] No FAILED events match the pooler-error signature. Nothing to do.",
    );
    return;
  }

  console.log(
    `[REQUEUE] Found ${candidates.length} FAILED event(s) matching the pooler-error signature:`,
  );
  for (const c of candidates) {
    console.log(
      `  - ${c.eventName} (id=${c.id}, tx=${c.txHash}#${c.logIndex}, attempts=${c.attempts})`,
    );
  }

  if (!apply) {
    console.log(
      "\n[REQUEUE] Dry run only — nothing was changed. Re-run with --apply to requeue these.",
    );
    return;
  }

  const { count } = await prisma.outboxEvent.updateMany({
    where: { id: { in: candidates.map((c) => c.id) } },
    data: {
      status: "PENDING",
      attempts: 0,
      lastError: null,
      claimedAt: null,
      nextAttemptAt: new Date(),
    },
  });

  console.log(
    `[REQUEUE] Requeued ${count} event(s) to PENDING. The running outbox worker will pick them up on its next poll.`,
  );
}

main()
  .catch((err) => {
    console.error("[REQUEUE] Fatal error:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
