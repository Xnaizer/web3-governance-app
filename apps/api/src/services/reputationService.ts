import { prisma, prismaDirect } from "../lib/prisma";
import type { Prisma, ReputationReason } from "@repo/database";

export const REPUTATION_DELTAS: Record<ReputationReason, number> = {
  PROGRAM_COMPLETED: 15,
  MILESTONE_FINALIZED: 5,
  FRAUD_PROVEN: -60,
  FALSE_FREEZE: -20,
  VALID_FREEZE: 20,
};

interface ApplyReputationParams {
  userId: string;
  reason: ReputationReason;
  programId?: number | null;
  tx?: Prisma.TransactionClient;
  idempotent?: boolean;
}

export async function applyReputation({
  userId,
  reason,
  programId = null,
  tx,
  idempotent = false,
}: ApplyReputationParams): Promise<{ applied: boolean; scoreAfter: number }> {
  const execute = async (
    db: Prisma.TransactionClient,
  ): Promise<{ applied: boolean; scoreAfter: number }> => {
    const delta = REPUTATION_DELTAS[reason];

    if (idempotent && programId != null) {
      const existing = await db.reputationLog.findFirst({
        where: {
          userId,
          reason,
          programId,
        },
        select: {
          scoreAfter: true,
        },
      });

      if (existing) {
        return {
          applied: false,
          scoreAfter: existing.scoreAfter,
        };
      }
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        reputationScore: true,
      },
    });

    if (!user) return { applied: false, scoreAfter: 0 };

    const oldScore = user.reputationScore;
    const newScore = Math.max(0, Math.min(100, user.reputationScore + delta));
    const actualChange = newScore - oldScore;

    const updatedUser = await db.user.update({
      where: {
        id: userId,
      },
      data: {
        reputationScore: newScore,
      },
      select: {
        reputationScore: true,
      },
    });

    await db.reputationLog.create({
      data: {
        userId,
        change: actualChange,
        reason,
        scoreAfter: updatedUser.reputationScore,
        programId,
      },
    });

    return {
      applied: true,
      scoreAfter: updatedUser.reputationScore,
    };
  };

  if (tx) {
    return execute(tx);
  }

  return prismaDirect.$transaction((trasaction) => execute(trasaction));
}

export async function resolvePicUserId(
  programId: number,
  tx?: Prisma.TransactionClient,
): Promise<string | null> {
  const db = tx ?? prisma;
  const program = await db.program.findUnique({
    where: { programId },
    select: {
      picId: true,
      picWallet: true,
    },
  });

  if (!program) return null;
  if (program.picId) return program.picId;

  const pic = await db.user.findUnique({
    where: { walletAddress: program.picWallet.toLowerCase() },
    select: { id: true },
  });

  return pic?.id ?? null;
}

export async function resolveAuditorUserId(
  programId: number,
  tx?: Prisma.TransactionClient,
): Promise<string | null> {
  const db = tx ?? prisma;
  const freeze = await db.freezeOutcome.findUnique({
    where: { programId },
    select: { auditorWallet: true },
  });

  if (!freeze) return null;

  const auditor = await db.user.findUnique({
    where: { walletAddress: freeze.auditorWallet.toLowerCase() },
    select: { id: true },
  });

  return auditor?.id ?? null;
}
