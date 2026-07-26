import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";

export const MAX_ATTEMPTS = 3;

const BASE_BACKOFF_MS = 3000;
const STALE_CLAIM_MS = 5 * 60_000;

export interface PendingEvent {
  txHash: string;
  logIndex: number;
  eventName: string;
  args: Record<string, unknown>;
}

export interface ClaimedEvent {
  id: string;
  txHash: string;
  logIndex: number;
  eventName: string;
  args: Record<string, unknown>;
  attempts: number;
}

function backoffMs(attempts: number): number {
  return BASE_BACKOFF_MS * 2 ** Math.max(0, attempts - 1);
}

export async function enqueue(events: PendingEvent[]): Promise<number> {
  if (events.length === 0) return 0;

  const { count } = await prisma.outboxEvent.createMany({
    data: events.map((e) => ({
      txHash: e.txHash,
      logIndex: e.logIndex,
      eventName: e.eventName,
      args: e.args as object,
    })),
    skipDuplicates: true,
  });

  return count;
}

export async function claimNext(): Promise<ClaimedEvent | null> {
  const rows = await prisma.$queryRaw<ClaimedEvent[]>`
    UPDATE "OutboxEvent"
    SET status = 'PROCESSING'::"OutboxStatus",
        attempts = "OutboxEvent".attempts + 1,
        "claimedAt" = now()
    WHERE id = (
      SELECT id FROM "OutboxEvent"
      WHERE status = 'PENDING'::"OutboxStatus"
        AND "nextAttemptAt" <= now()
      ORDER BY "createdAt" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, "txHash", "logIndex", "eventName", args, attempts;
  `;

  return rows[0] ?? null;
}

export async function markDone(id: string): Promise<void> {
  await prisma.outboxEvent.update({
    where: { id },
    data: {
      status: "DONE",
      processedAt: new Date(),
      lastError: null,
      claimedAt: null,
    },
  });
}

export async function markFailed(
  event: ClaimedEvent,
  err: unknown,
): Promise<{ willRetry: boolean }> {
  const message = (err as Error)?.message ?? String(err);
  const willRetry = event.attempts < MAX_ATTEMPTS;

  await prisma.outboxEvent.update({
    where: { id: event.id },
    data: willRetry
      ? {
          status: "PENDING",
          lastError: message.slice(0, 1000),
          nextAttemptAt: new Date(Date.now() + backoffMs(event.attempts)),
          claimedAt: null,
        }
      : {
          status: "FAILED",
          lastError: message.slice(0, 1000),
          claimedAt: null,
        },
  });

  return { willRetry };
}

export async function recoverStale(): Promise<number> {
  const { count } = await prisma.outboxEvent.updateMany({
    where: {
      status: "PROCESSING",
      claimedAt: { lt: new Date(Date.now() - STALE_CLAIM_MS) },
    },
    data: { status: "PENDING", claimedAt: null },
  });

  if (count > 0) {
    logger.warn({ count }, "[OUTBOX] Recovered stale PROCESSING events");
  }

  return count;
}
