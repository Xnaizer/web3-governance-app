import { prisma } from "../lib/prisma";
import {
  handleProposalVoted,
  handleProposalApproved,
} from "../services/webhookService";

async function main(): Promise<void> {
  const events = await prisma.outboxEvent.findMany({
    where: {
      status: "DONE",
      eventName: { in: ["ProposalVoted", "ProposalApproved"] },
    },
    orderBy: [{ createdAt: "asc" }, { logIndex: "asc" }],
  });

  console.log(`[BACKFILL] Found ${events.length} historical proposal events`);

  let votesLogged = 0;
  let approvalsApplied = 0;
  let skipped = 0;

  for (const event of events) {
    const args = event.args as Record<string, unknown>;

    try {
      if (event.eventName === "ProposalVoted") {
        const before = await prisma.proposalVoteLog.count({
          where: {
            programId: Number(args.programId),
            voterWallet: String(args.validator ?? "").toLowerCase(),
          },
        });

        await handleProposalVoted(args, event.txHash);

        if (before === 0) votesLogged++;
      } else if (event.eventName === "ProposalApproved") {
        const programId = Number(args.programId);
        const program = await prisma.program.findUnique({
          where: { programId },
          select: { status: true },
        });

        if (program && program.status === "PENDING") {
          await handleProposalApproved(args, event.txHash);
          approvalsApplied++;
        } else {
          skipped++;
        }
      }
    } catch (err) {
      console.error(
        `[BACKFILL] Failed on event ${event.id} (${event.eventName}, program ${args.programId}):`,
        err,
      );
    }
  }

  console.log(
    `[BACKFILL] Done. New vote logs: ${votesLogged}, approvals applied: ${approvalsApplied}, skipped: ${skipped}`,
  );
}

main()
  .catch((err) => {
    console.error("[BACKFILL] Fatal error:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
