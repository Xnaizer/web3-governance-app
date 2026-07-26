import { prisma, txDirect } from "../lib/prisma";
import { computeProgramHash } from "@repo/shared";
import { invalidate, invalidatePattern } from "../lib/cache";
import { mapRoleHashToSignerRole, mapRoleHashToRole } from "./roleMapper";
import {
  applyReputation,
  resolvePicUserId,
  resolveAuditorUserId,
} from "./reputationService";
import { sanitizeText } from "../utils/sanitize";
import { getOnChainProposal, PROPOSAL_STATUS_BY_INDEX } from "./contractService";
import { deriveTab } from "./reconciliationService";


export interface DecodedEvent {
  eventName: string;
  args: Record<string, unknown>;
  txHash?: string;
}

type EventHandler = (
  args: Record<string, unknown>,
  txHash?: string,
) => Promise<unknown>;

const eventHandlers: Record<string, EventHandler> = {
  ProposalSubmitted: handleProposalSubmitted,
  ProposalVoted: handleProposalVoted,
  ProposalApproved: handleProposalApproved,
  MilestoneReleased: handleMilestoneReleased,
  MilestoneFinalized: handleMilestoneFinalized,
  ProgramCompleted: handleProgramCompleted,
  OnChainWithdrawalLogged: handleWithdrawalLogged,
  ProgramForceFrozen: handleProgramForceFrozen,
  UnfreezeAppealSubmitted: handleUnfreezeAppealSubmitted,
  UnfreezeAppealVoted: handleUnfreezeAppealVoted,
  ProgramUnfrozenViaBFT: handleProgramUnfrozenViaBFT,
  ProgramFraudConfirmed: handleProgramFraudConfirmed,
  RoleVoteCreated: handleRoleVoteCreated,
  RoleVoteCast: handleRoleVoteCast,
  RoleGrantedViaGovernance: handleRoleGrantedViaGovernance,
  RoleRevokedViaGovernance: handleRoleRevokedViaGovernance,
  PicRoleGrantedByAdmin: handlePicRoleGrantedByAdmin,
  PicRoleRevokedByAdmin: handlePicRoleRevokedByAdmin,
  RedemptionRequested: handleRedemptionRequested,
  RedemptionSettled: handleRedemptionSettled,
  RedemptionCancelled: handleRedemptionCancelled,
  ExchangeTokenToFiat: handleExchangeTokenToFiat,
};

export function isKnownEvent(name: string): boolean {
  return name in eventHandlers;
}

async function invalidateProgramCache(programId: number): Promise<void> {
  await invalidate(`program:detail:${programId}`);
  await invalidate(`program:withdrawals:${programId}`);
  await invalidatePattern("programs:list:*");
  await invalidate("public:stats");
}

async function invalidateRedemptionCache(): Promise<void> {
  await invalidatePattern("redemptions:*");
}

export async function dispatchEvent(event: DecodedEvent): Promise<void> {
  const handler = eventHandlers[event.eventName];

  if (!handler) {
    console.warn(`[WEBHOOK] No handler for event: ${event.eventName}`);
    return;
  }

  const result = await handler(event.args, event.txHash);
  console.log(`[WEBHOOK] Handled ${event.eventName}: `, result);
}

async function handleProposalSubmitted(
  args: Record<string, unknown>,
  txHash?: string,
): Promise<{ result: string; programId: number }> {
  const programId = Number(args.programId);
  const onChainHash = String(args.programHash).toLowerCase();
  const picWallet = String(args.picWallet).toLowerCase();

  const existing = await prisma.program.findUnique({
    where: { programId },
  });

  if (!existing) {
    await prisma.program.create({
      data: {
        programId,
        programHash: onChainHash,
        picWallet: picWallet,
        totalBudget: "0",
        milestoneCount: 0,
        integrity: "ORPHAN",
        displayTab: "FLAGGED",
        isOrphan: true,
        isOnChain: true,
        status: "PENDING",
        txHash: txHash ?? null,
        submittedAt: new Date(),
      },
    });

    await invalidateProgramCache(programId);

    return { result: "ORPHAN", programId };
  }

  const recomputedHash = computeProgramHash({
    programId: existing.programId,
    title: existing.title,
    description: existing.description,
    totalBudget: existing.totalBudget,
    picWallet: existing.picWallet,
    milestoneCount: existing.milestoneCount,
    province: existing.province,
    regency: existing.regency,
    district: existing.district,
    locationAddress: existing.locationAddress,
    executorName: existing.executorName,
    executorRegistration: existing.executorRegistration,
    category: existing.category,
    institutionName: existing.institutionName,
    fiscalYear: existing.fiscalYear,
  }).toLowerCase();

  if (recomputedHash === onChainHash) {
    await prisma.program.update({
      where: { programId },
      data: {
        integrity: "VERIFIED",
        displayTab: "ACTIVE",
        isOnChain: true,
        txHash: txHash ?? existing.txHash,
        submittedAt: existing.submittedAt ?? new Date(),
      },
    });

    await invalidateProgramCache(programId);

    return { result: "VERIFIED", programId };
  }

  await prisma.program.update({
    where: {
      programId,
    },
    data: {
      integrity: "HASH_MISMATCH",
      displayTab: "FLAGGED",
      isOnChain: true,
      txHash: txHash ?? existing.txHash,
    },
  });

  await invalidateProgramCache(programId);

  return { result: "HASH_MISMATCH", programId };
}

export async function handleProposalVoted(
  args: Record<string, unknown>,
  txHash?: string,
): Promise<{ result: string; programId: number }> {
  const programId = Number(args.programId);
  const currentVotes = Number(args.currentVotes);
  const validator = String(args.validator ?? "").toLowerCase();

  console.log(
    `[WEBHOOK] ProposalVoted program ${programId}, votes: ${currentVotes}`,
  );

  if (validator) {
    await prisma.proposalVoteLog.upsert({
      where: {
        programId_voterWallet: { programId, voterWallet: validator },
      },
      update: { txHash: txHash ?? undefined },
      create: { programId, voterWallet: validator, txHash },
    });
    await invalidateProgramCache(programId);
  }

  return { result: "PROPOSAL_VOTED_LOGGED", programId };
}

export async function handleProposalApproved(
  args: Record<string, unknown>,
  txHash?: string,
): Promise<{ result: string; programId: number }> {
  const programId = Number(args.programId);

  const existing = await prisma.program.findUnique({
    where: {
      programId,
    },
  });

  if (!existing) {
    console.warn(`[WEBHOOK] ProposalApproved for unknown program ${programId}`);
    return { result: "SKIPPED_NOT_FOUND", programId };
  }

  await prisma.program.update({
    where: { programId },
    data: {
      status: "APPROVED",
      displayTab: "ACTIVE",
      txHash: txHash ?? existing.txHash,
    },
  });

  await invalidateProgramCache(programId);
  return { result: "APPROVED", programId };
}

export async function handleMilestoneReleased(
  args: Record<string, unknown>,
  txHash?: string,
): Promise<{ result: string; programId: number }> {
  const programId = Number(args.programId);
  const milestoneIndex = Number(args.milestoneIndex);
  const milestoneBudget = String(args.milestoneBudget);

  const existing = await prisma.program.findUnique({
    where: {
      programId,
    },
  });

  if (!existing) {
    console.warn(
      `[WEBHOOK] MilestoneReleased for unknown program ${programId}`,
    );
    return { result: "SKIPPED_NOT_FOUND", programId };
  }

  await txDirect(async (tx: any ) => {
    await tx.program.update({
      where: { programId },
      data: {
        status: "DRAWABLE",
        displayTab: "ACTIVE",
        currentMilestone: milestoneIndex + 1,
        totalAllocatedSoFar: (
          BigInt(existing.totalAllocatedSoFar) + BigInt(milestoneBudget)
        ).toString(),
        txHash: txHash ?? existing.txHash,
      },
    });

    await tx.milestone.updateMany({
      where: {
        programId,
        milestoneIndex,
      },
      data: {
        status: "RELEASED",
      },
    });
  });

  await invalidateProgramCache(programId);

  return { result: "MILESTONE_RELEASED", programId };
}

export async function handleMilestoneFinalized(
  args: Record<string, unknown>,
  txHash?: string,
): Promise<{ result: string; programId: number }> {
  const programId = Number(args.programId);
  const milestoneIndex = Number(args.milestoneIndex);

  const existing = await prisma.program.findUnique({
    where: {
      programId,
    },
  });

  if (!existing) {
    console.warn(
      `[WEBHOOK] MilestoneFinalized for unknown program ${programId}`,
    );
    return { result: "SKIPPED_NOT_FOUND", programId };
  }

  await txDirect(async (tx: any ) => {
    await tx.program.update({
      where: { programId },
      data: {
        status: "MILESTONE_ACHIEVED",
        txHash: txHash ?? existing.txHash,
      },
    });

    const picUserId = await resolvePicUserId(programId, tx);

    if (picUserId) {
      await applyReputation({
        userId: picUserId,
        reason: "MILESTONE_FINALIZED",
        programId,
        tx,
        idempotent: false, // NOTE: not idempotent per-milestone; duplicate webhook may double-count (known limitation) *future work
      });
    } else {
      console.warn(
        `[REPUTATION] MilestoneFinalized PIC for unknown program ${programId}`,
      );
    }

    await tx.milestone.updateMany({
      where: {
        programId,
        milestoneIndex,
      },
      data: {
        status: "ACHIEVED",
      },
    });
  });

  await invalidateProgramCache(programId);

  return { result: "MILESTONE_FINALIZED", programId };
}

export async function handleProgramCompleted(
  args: Record<string, unknown>,
  txHash?: string,
): Promise<{ result: string; programId: number }> {
  const programId = Number(args.programId);

  const existing = await prisma.program.findUnique({
    where: { programId },
  });

  if (!existing) {
    console.warn(`[WEBHOOK] ProgramCompleted for unknown program ${programId}`);
    return { result: "SKIPPED_NOT_FOUND", programId };
  }

  await txDirect(async (tx: any ) => {
    await tx.program.update({
      where: { programId },
      data: {
        status: "COMPLETED",
        displayTab: "FINISHED",
        txHash: txHash ?? existing.txHash,
      },
    });

    const picUserId = await resolvePicUserId(programId, tx);

    if (picUserId) {
      await applyReputation({
        userId: picUserId,
        reason: "PROGRAM_COMPLETED",
        programId,
        tx,
        idempotent: true,
      });
    } else {
      console.warn(
        `[REPUTATION] ProgramCompleted for unknown prgoram ${programId}`,
      );
    }
  });

  await invalidateProgramCache(programId);

  return { result: "COMPLETED", programId };
}

export async function handleWithdrawalLogged(
  args: Record<string, unknown>,
  txHash?: string,
): Promise<{ result: string; programId: number }> {
  const programId = Number(args.programId);
  const picWallet = String(args.picWallet).toLowerCase();
  const amount = String(args.amount);
  const recipient = sanitizeText(String(args.recipient ?? ""));
  const description = sanitizeText(String(args.description ?? ""));

  const existing = await prisma.program.findUnique({
    where: { programId },
  });

  if (!existing) {
    console.warn(`[WEBHOOK] Withdrawal for unknown program ${programId}`);
    return { result: "SKIPPED_NOT_FOUND", programId };
  }

  if (txHash) {
    const dup = await prisma.withdrawalRecord.findFirst({
      where: { programId, txHash },
      select: { id: true },
    });
    if (dup) {
      return { result: "DUPLICATE_SKIPPED", programId };
    }
  }

  await prisma.withdrawalRecord.create({
    data: {
      amount,
      recipientName: recipient,
      description,
      timestamp: new Date(),
      txHash: txHash ?? null,
      picWallet,
      programId,
    },
  });

  const onChain = await getOnChainProposal(programId);
  if (onChain) {
    const onChainStatus = PROPOSAL_STATUS_BY_INDEX[onChain.status] ?? existing.status;
    const onChainMilestone = Number(onChain.currentMilestone);
    const onChainAllocated = onChain.totalAllocatedSoFar.toString();

    const data: Record<string, unknown> = {};
    if (existing.status !== onChainStatus) {
      data.status = onChainStatus;
      const targetTab = deriveTab(onChainStatus);
      if (existing.displayTab !== targetTab) data.displayTab = targetTab;
    }
    if (existing.currentMilestone !== onChainMilestone)
      data.currentMilestone = onChainMilestone;
    if (existing.totalAllocatedSoFar !== onChainAllocated)
      data.totalAllocatedSoFar = onChainAllocated;

    if (Object.keys(data).length > 0) {
      await prisma.program.update({ where: { programId }, data });
    }
  }

  await invalidateProgramCache(programId);

  return { result: "WITHDRAWAL_LOGGED", programId };
}

export async function handleProgramForceFrozen(
  args: Record<string, unknown>,
  txHash?: string,
): Promise<{ result: string; programId: number }> {
  const programId = Number(args.programId);
  const auditorWallet = String(args.auditor).toLowerCase();

  const existing = await prisma.program.findUnique({
    where: { programId },
  });

  if (!existing) {
    console.warn(`[WEBHOOK] ForceFrozen for unknown program ${programId}`);
    return { result: "SKIPPED_NOT_FOUND", programId };
  }

  await txDirect(async (tx: any ) => {
    await tx.program.update({
      where: { programId },
      data: {
        status: "FROZEN",
        displayTab: "FLAGGED",
        txHash: txHash ?? existing.txHash,
      },
    });

    await tx.freezeOutcome.upsert({
      where: { programId },
      create: {
        programId,
        auditorWallet,
        outcome: "PENDING",
        frozenAt: new Date(),
        txHash: txHash ?? null,
      },
      update: {
        auditorWallet,
        txHash: txHash ?? undefined,
      },
    });
  });

  await invalidateProgramCache(programId);

  return { result: "FROZEN", programId };
}

export async function handleUnfreezeAppealSubmitted(
  args: Record<string, unknown>,
  txHash?: string,
): Promise<{ result: string; programId: number }> {
  const programId = Number(args.programId);
  const picWallet = String(args.picWallet).toLowerCase();

  const existing = await prisma.program.findUnique({
    where: { programId },
  });

  if (!existing) {
    console.warn(`[WEBHOOK] UnfreezeAppeal for unknown program ${programId}`);
    return { result: "SKIPPED_NOT_FOUND", programId };
  }

  await prisma.unfreezeVote.create({
    data: {
      programId,
      picWallet,
      approveVotes: 0,
      rejectVotes: 0,
      resolved: false,
      appealStartedAt: new Date(),
      txHash: txHash ?? null,
    },
  });

  await invalidateProgramCache(programId);
  await invalidatePattern("votes:unfreeze:*");

  return { result: "APPEAL_SUBMITTED", programId };
}

export async function handleUnfreezeAppealVoted(
  args: Record<string, unknown>,
  txHash?: string,
): Promise<{ result: string; programId: number }> {
  const programId = Number(args.programId);
  const validatorWallet = String(args.validator).toLowerCase();
  const approve = Boolean(args.approve);
  const approveVotes = Number(args.approveVotes);
  const rejectVotes = Number(args.rejectVotes);

  const unfreezeVote = await prisma.unfreezeVote.findUnique({
    where: { programId },
  });

  if (!unfreezeVote) {
    console.warn(`[WEBHOOK] UnfreezeVote not found for program ${programId}`);
    return { result: "SKIPPED_NOT_FOUND", programId };
  }

  await prisma.unfreezeVote.update({
    where: { programId },
    data: {
      approveVotes,
      rejectVotes,
    },
  });

  const voter = await prisma.user.findUnique({
    where: {
      walletAddress: validatorWallet,
    },
  });

  if (voter) {
    await prisma.unfreezeVoteBallot.upsert({
      where: {
        unfreezeVoteId_voterId: {
          unfreezeVoteId: unfreezeVote.id,
          voterId: voter.id,
        },
      },
      create: {
        unfreezeVoteId: unfreezeVote.id,
        voterId: voter.id,
        approve,
      },
      update: {
        approve,
      },
    });
  } else {
    console.warn(
      `[WEBHOOK] Validator ${validatorWallet} not found as User, skip ballot`,
    );
  }

  await invalidateProgramCache(programId);
  await invalidatePattern("votes:unfreeze:*");

  return { result: "APPEAL_VOTED", programId };
}

export async function handleProgramUnfrozenViaBFT(
  args: Record<string, unknown>,
  txHash?: string,
): Promise<{ result: string; programId: number }> {
  const programId = Number(args.programId);

  const existing = await prisma.program.findUnique({
    where: { programId },
  });

  if (!existing) {
    console.warn(`[WEBHOOK] Unfrozen for unknown program ${programId}`);
    return { result: "SKIPPED_NOT_FOUND", programId };
  }

  await txDirect(async (tx: any ) => {
    await tx.program.update({
      where: { programId },
      data: {
        status: "DRAWABLE",
        displayTab: "ACTIVE",
        txHash: txHash ?? existing.txHash,
      },
    });

    await tx.freezeOutcome.update({
      where: { programId },
      data: {
        outcome: "CLEARED",
        resolvedAt: new Date(),
      },
    });

    await tx.unfreezeVote.update({
      where: { programId },
      data: { resolved: true },
    });

    const auditorUserId = await resolveAuditorUserId(programId, tx);

    if (auditorUserId) {
      await applyReputation({
        userId: auditorUserId,
        reason: "FALSE_FREEZE",
        programId,
        tx,
        idempotent: true,
      });
    } else {
      console.warn(
        `[REPUTATION] Unfrozen Auditor for unknown program ${programId}`,
      );
    }
  });

  await invalidateProgramCache(programId);
  await invalidatePattern("votes:unfreeze:*");

  return { result: "UNFROZEN", programId };
}

export async function handleProgramFraudConfirmed(
  args: Record<string, unknown>,
  txHash?: string,
): Promise<{ result: string; programId: number }> {
  const programId = Number(args.programId);

  const existing = await prisma.program.findUnique({
    where: { programId },
  });

  if (!existing) {
    console.warn(`[WEBHOOK] FraudConfirmed for unknown program ${programId}`);
    return { result: "SKIPPED_NOT_FOUND", programId };
  }

  await txDirect(async (tx: any ) => {
    await tx.program.update({
      where: { programId },
      data: {
        status: "FRAUD_CONFIRMED",
        displayTab: "FRAUD",
        txHash: txHash ?? existing.txHash,
      },
    });

    await tx.freezeOutcome.update({
      where: { programId },
      data: {
        outcome: "FRAUD_PROVEN",
        resolvedAt: new Date(),
      },
    });

    await tx.unfreezeVote.update({
      where: { programId },
      data: {
        resolved: true,
      },
    });

    const picUserId = await resolvePicUserId(programId, tx);

    if (picUserId) {
      await applyReputation({
        userId: picUserId,
        reason: "FRAUD_PROVEN",
        programId,
        tx,
        idempotent: true,
      });
    } else {
      console.warn(
        `[REPUTATION] FraudConfirmed PIC for unknown program ${programId}`,
      );
    }

    const auditorUserId = await resolveAuditorUserId(programId, tx);

    if (auditorUserId) {
      await applyReputation({
        userId: auditorUserId,
        reason: "VALID_FREEZE",
        programId,
        tx,
        idempotent: true,
      });
    } else {
      console.warn(
        `[REPUTATION] FraudConfirmed Auditor for unknown program ${programId}`,
      );
    }
  });

  await invalidateProgramCache(programId);
  await invalidatePattern("votes:unfreeze:*");

  return { result: "FRAUD_CONFIRMED", programId };
}

export async function handleRoleVoteCreated(
  args: Record<string, unknown>,
  txHash?: string,
): Promise<{ result: string; voteId: number }> {
  const voteId = Number(args.voteId);
  const candidate = String(args.candidate).toLowerCase();
  const roleHash = String(args.roleToTarget);
  const isDevote = Boolean(args.isDevote);
  const grantedBy = String(args.grantedBy).toLowerCase();

  const roleToTarget = mapRoleHashToSignerRole(roleHash);

  if (!roleToTarget) {
    console.warn(`[WEBHOOK] RoleVoteCreated unknown role hash ${roleHash}`);
    return { result: "SKIPPED_UNKNOWN_ROLE", voteId };
  }

  await prisma.roleVote.upsert({
    where: { voteId },
    create: {
      voteId,
      candidate,
      roleToTarget,
      voteCount: 0,
      isDevote,
      executed: false,
      grantedBy,
      submittedAt: new Date(),
      txHash: txHash ?? null,
    },
    update: {},
  });

  await invalidatePattern("votes:role:*");

  return { result: "ROLE_VOTE_CREATED", voteId };
}

export async function handleRoleVoteCast(
  args: Record<string, unknown>,
  _txHash?: string,
): Promise<{ result: string; voteId: number }> {
  const voteId = Number(args.voteId);
  const adminWallet = String(args.admin).toLowerCase();
  const currentVotes = Number(args.currentVotes);

  const roleVote = await prisma.roleVote.findUnique({
    where: { voteId },
  });

  if (!roleVote) {
    console.warn(`[WEBHOOK] RoleVoteCast for unknown vote ${voteId}`);
    return { result: "SKIPPED_NOT_FOUND", voteId };
  }

  await prisma.roleVote.update({
    where: { voteId },
    data: {
      voteCount: currentVotes,
    },
  });

  const voter = await prisma.user.findUnique({
    where: { walletAddress: adminWallet },
  });

  if (voter) {
    await prisma.roleVoteBallot.upsert({
      where: {
        roleVoteId_voterId: { roleVoteId: voteId, voterId: voter.id },
      },
      create: { roleVoteId: voteId, voterId: voter.id },
      update: {},
    });
  } else {
    console.warn(
      `[WEBHOOK] Admin ${adminWallet} not found as User, skip ballot`,
    );
  }

  await invalidatePattern("votes:role:*");

  return { result: "ROLE_VOTE_CAST", voteId };
}

export async function handleRoleGrantedViaGovernance(
  args: Record<string, unknown>,
  txHash?: string,
): Promise<{ result: string }> {
  const roleHash = String(args.role);
  const account = String(args.account).toLowerCase();
  const voteId = Number(args.voteId);

  const role = mapRoleHashToRole(roleHash);

  if (!role) {
    console.warn(`[WEBHOOK] RoleGranted unknown role hash ${roleHash}`);
    return {
      result: "SKIPPED_UNKNOWN_ROLE",
    };
  }

  const user = await prisma.user.findUnique({
    where: { walletAddress: account },
  });

  if (!user) {
    console.warn(`[WEBHOOK] RoleGranted: user ${account} not found`);
    return { result: "SKIPPED_USER_NOT_FOUND" };
  }

  await txDirect(async (tx: any) => {
    const updatedUser = await tx.user.update({
      where: {
        id: user.id,
        updatedAt: user.updatedAt,
      },
      data: { role },
      select: { id: true, role: true, updatedAt: true },
    });

    await tx.roleChangeLog.create({
      data: {
        changeType: "ROLE_GRANTED",
        targetWallet: account,
        targetRole: role,
        actorWallet: null,
        txHash: txHash ?? null,
      },
    });

    const roleVote = await tx.roleVote.findUnique({ where: { voteId } });
    if (roleVote) {
      await tx.roleVote.update({
        where: { voteId },
        data: { executed: true },
      });
    } else {
      console.warn(
        `[WEBHOOK] RoleGranted: roleVote ${voteId} not found, skip executed flag`,
      );
    }

    return updatedUser;
  });

  await invalidatePattern("votes:role:*");

  return { result: `ROLE_GRANTED_${role}` };
}

export async function handleRoleRevokedViaGovernance(
  args: Record<string, unknown>,
  txHash?: string,
): Promise<{ result: string }> {
  const account = String(args.account).toLowerCase();
  const voteId = Number(args.voteId);

  const user = await prisma.user.findUnique({
    where: { walletAddress: account },
  });

  if (!user) {
    console.warn(`[WEBHOOK] RoleRevoked: user ${account} not found`);
    return { result: "SKIPPED_USER_NOT_FOUND" };
  }

  await txDirect(async (tx: any) => {
    const updatedUser = await tx.user.update({
      where: {
        id: user.id,
        updatedAt: user.updatedAt,
      },
      data: { role: "USER" },
      select: { id: true, role: true, updatedAt: true },
    });

    await tx.roleChangeLog.create({
      data: {
        changeType: "ROLE_REVOKED",
        targetWallet: account,
        targetRole: "USER",
        actorWallet: null,
        txHash: txHash ?? null,
      },
    });

    const roleVote = await tx.roleVote.findUnique({ where: { voteId } });
    if (roleVote) {
      await tx.roleVote.update({
        where: { voteId },
        data: { executed: true },
      });
    } else {
      console.warn(
        `[WEBHOOK] RoleRevoked: roleVote ${voteId} not found, skip executed flag`,
      );
    }

    return updatedUser;
  });

  await invalidatePattern("votes:role:*");

  return { result: "ROLE_REVOKED" };
}

export async function handlePicRoleGrantedByAdmin(
  args: Record<string, unknown>,
  txHash?: string,
): Promise<{ result: string }> {
  const account = String(args.account).toLowerCase();
  const admin = String(args.admin).toLowerCase();

  const user = await prisma.user.findUnique({
    where: { walletAddress: account },
  });

  if (!user) {
    console.warn(`[WEBHOOK] PicRoleGranted: user ${account} not found`);
    return { result: "SKIPPED_USER_NOT_FOUND" };
  }

  await txDirect(async (tx: any ) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        role: "PIC",
      },
    });

    await tx.roleChangeLog.create({
      data: {
        changeType: "PIC_GRANTED",
        targetWallet: account,
        targetRole: "PIC",
        actorWallet: admin,
        txHash: txHash ?? null,
      },
    });
  });

  return { result: "PIC_GRANTED" };
}

export async function handlePicRoleRevokedByAdmin(
  args: Record<string, unknown>,
  txHash?: string,
): Promise<{ result: string }> {
  const account = String(args.account).toLowerCase();
  const admin = String(args.admin).toLowerCase();

  const user = await prisma.user.findUnique({
    where: { walletAddress: account },
  });

  if (!user) {
    console.warn(`[WEBHOOK] PicRoleRevoked: user ${account} not found`);
    return { result: "SKIPPED_USER_NOT_FOUND" };
  }

  await txDirect(async (tx: any ) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        role: "USER",
      },
    });

    await tx.roleChangeLog.create({
      data: {
        changeType: "PIC_REVOKED",
        targetWallet: account,
        targetRole: "USER",
        actorWallet: admin,
        txHash: txHash ?? null,
      },
    });
  });

  return { result: "PIC_REVOKED" };
}

export async function handleRedemptionRequested(
  args: Record<string, unknown>,
  txHash?: string,
): Promise<{ result: string; redemptionId: number }> {
  const redemptionId = Number(args.id);
  const picWallet = String(args.pic).toLowerCase();
  const amount = String(args.amount);

  const pic = await prisma.user.findUnique({
    where: { walletAddress: picWallet },
    select: { id: true },
  });

  await prisma.redemption.upsert({
    where: { redemptionId },
    create: {
      redemptionId,
      picWallet,
      amount,
      status: "PENDING",
      requestedAt: new Date(),
      requestTxHash: txHash ?? null,
      picId: pic?.id ?? null,
    },
    update: {},
  });

  await invalidateRedemptionCache();

  return { result: "REDEMPTION_REQUESTED", redemptionId };
}

export async function handleRedemptionSettled(
  args: Record<string, unknown>,
  txHash?: string,
): Promise<{ result: string; redemptionId: number }> {
  const redemptionId = Number(args.id);

  const existing = await prisma.redemption.findUnique({
    where: { redemptionId },
  });

  if (!existing) {
    console.warn(
      `[WEBHOOK] RedemptionSettled unknown redemption ${redemptionId}`,
    );
    return { result: "SKIPPED_NOT_FOUND", redemptionId };
  }

  if (existing.status === "SETTLED")
    return { result: "ALREADY_SETTLED", redemptionId };

  await prisma.redemption.update({
    where: { redemptionId },
    data: {
      status: "SETTLED",
      settledAt: new Date(),
      settleTxHash: txHash ?? existing.settleTxHash,
    },
  });

  await invalidateRedemptionCache();

  return { result: "REDEMPTION_SETTLED", redemptionId };
}

export async function handleRedemptionCancelled(
  args: Record<string, unknown>,
  txHash?: string,
): Promise<{ result: string; redemptionId: number }> {
  const redemptionId = Number(args.id);
  const byPic = Boolean(args.byPic);

  const existing = await prisma.redemption.findUnique({
    where: { redemptionId },
  });
  if (!existing) {
    console.warn(
      `[WEBHOOK] RedemptionCancelled unknown redemption ${redemptionId}`,
    );
    return { result: "SKIPPED_NOT_FOUND", redemptionId };
  }
  if (existing.status === "CANCELLED")
    return { result: "ALREADY_CANCELLED", redemptionId };

  await prisma.redemption.update({
    where: { redemptionId },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelledByPic: byPic,
      cancelTxHash: txHash ?? existing.cancelTxHash,
    },
  });

  await invalidateRedemptionCache();
  return { result: "REDEMPTION_CANCELLED", redemptionId };
}

export async function handleExchangeTokenToFiat(
  args: Record<string, unknown>,
  _txHash?: string,
): Promise<{ result: string }> {
  console.log(
    `[WEBHOOK] ExchangeTokenToFiat pic=${String(
      args.picWallet,
    ).toLowerCase()} amount=${String(args.amount)}`,
  );
  return { result: "FIAT_EXCHANGE_LOGGED" };
}
