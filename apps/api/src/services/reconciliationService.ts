import { prisma } from "../lib/prisma";
import { computeProgramHash } from "@repo/shared";
import { getOnChainProposal, PROPOSAL_STATUS_BY_INDEX } from "./contractService";
import { invalidate, invalidatePattern } from "../lib/cache";
import { Prisma, type ProposalStatus } from "@repo/database";

const STATUS_BY_INDEX: readonly ProposalStatus[] = PROPOSAL_STATUS_BY_INDEX;

export function deriveTab(
  status: string,
): "ACTIVE" | "FINISHED" | "FLAGGED" | "FRAUD" {
  if (status === "COMPLETED") return "FINISHED";
  if (status === "FRAUD_CONFIRMED") return "FRAUD";
  if (status === "FROZEN") return "FLAGGED";
  return "ACTIVE";
}

export async function runReconciliation() {
  const programs = await prisma.program.findMany({
    where: { isOnChain: true, isOrphan: false },
    select: {
      programId: true,
      title: true,
      description: true,
      totalBudget: true,
      picWallet: true,
      milestoneCount: true,
      province: true,
      regency: true,
      district: true,
      locationAddress: true,
      executorName: true,
      executorRegistration: true,
      category: true,
      institutionName: true,
      fiscalYear: true,
      integrity: true,
      displayTab: true,
      status: true,
      currentMilestone: true,
      totalAllocatedSoFar: true,
    },
  });

  let checked = 0,
    verified = 0,
    mismatched = 0,
    missing = 0,
    synced = 0;

  for (const program of programs) {
    checked++;
    const onChain = await getOnChainProposal(program.programId);

    if (!onChain) {
      missing++;
      await prisma.program.update({
        where: { programId: program.programId },
        data: { integrity: "HASH_MISMATCH", displayTab: "FLAGGED" },
      });
      continue;
    }

    const recomputed = computeProgramHash({
      programId: program.programId,
      title: program.title,
      description: program.description,
      totalBudget: program.totalBudget,
      picWallet: program.picWallet,
      milestoneCount: program.milestoneCount,
      province: program.province,
      regency: program.regency,
      district: program.district,
      locationAddress: program.locationAddress,
      executorName: program.executorName,
      executorRegistration: program.executorRegistration,
      category: program.category,
      institutionName: program.institutionName,
      fiscalYear: program.fiscalYear,
    }).toLowerCase();

    const hashOk = recomputed === onChain.programHash.toLowerCase();

    const onChainStatus = STATUS_BY_INDEX[onChain.status] ?? program.status;
    const onChainMilestone = Number(onChain.currentMilestone);
    const onChainAllocated = onChain.totalAllocatedSoFar.toString();

    const data: Prisma.ProgramUpdateInput = {};

    if (hashOk) {
      verified++;
      if (program.integrity !== "VERIFIED") data.integrity = "VERIFIED";
      const targetTab = deriveTab(onChainStatus);
      if (program.displayTab !== targetTab) data.displayTab = targetTab;
    } else {
      mismatched++;
      if (program.integrity !== "HASH_MISMATCH")
        data.integrity = "HASH_MISMATCH";
      if (program.displayTab !== "FLAGGED") data.displayTab = "FLAGGED";
    }

    if (program.status !== onChainStatus) data.status = onChainStatus;
    if (program.currentMilestone !== onChainMilestone)
      data.currentMilestone = onChainMilestone;
    if (program.totalAllocatedSoFar !== onChainAllocated)
      data.totalAllocatedSoFar = onChainAllocated;

    if (Object.keys(data).length > 0) {
      synced++;
      await prisma.program.update({
        where: { programId: program.programId },
        data,
      });
    }
  }

  await invalidatePattern("programs:list:*");
  await invalidate("public:stats");

  const summary = {
    checked,
    verified,
    mismatched,
    missing,
    synced,
    at: new Date().toISOString(),
  };
  console.log("[RECONCILIATION]", summary);
  return summary;
}
