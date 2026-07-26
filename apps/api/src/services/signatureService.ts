import { recoverTypedDataAddress } from "viem";
import { prisma, txDirect } from "../lib/prisma";
import { AppError } from "../utils/AppError";
import { EIP712_DOMAIN, EIP712_TYPES } from "@repo/shared";
import { hasRole } from "./contractService";
import { mapSignerRoleToRoleHash } from "./roleMapper";
import type { SubmitSignatureInput } from "../validators/signatureValidator";

const SIGNABLE_STATUSES = ["APPROVED", "MILESTONE_ACHIEVED"];

export async function submitSignature(
  userId: string,
  input: SubmitSignatureInput,
) {
  const milestone = await prisma.milestone.findUnique({
    where: { id: input.milestoneId },
    include: {
      program: {
        select: {
          programId: true,
          currentMilestone: true,
          status: true,
        },
      },
    },
  });

  if (!milestone) {
    throw new AppError("Milestone not found", 404);
  }

  const program = milestone.program;

  if (milestone.milestoneIndex !== program.currentMilestone) {
    throw new AppError(
      `Milestone not active for signing (expected index ${program.currentMilestone})`,
      409,
    );
  }

  if (!SIGNABLE_STATUSES.includes(program.status)) {
    throw new AppError(
      `Program status ${program.status} does not allow signing`,
      409,
    );
  }

  if (input.milestoneIndex !== milestone.milestoneIndex) {
    throw new AppError("milestoneIndex does not match milestone record", 400);
  }

  if (BigInt(input.milestoneBudget) !== BigInt(milestone.milestoneBudget)) {
    throw new AppError("milestoneBudget does not match milestone record", 400);
  }

  const evidenceHash = input.evidenceHash.toLowerCase();

  if (
    milestone.evidenceHash &&
    milestone.evidenceHash.toLowerCase() !== evidenceHash
  ) {
    throw new AppError(
      "evidenceHash mismatch: signature set is bound to the first submitted document",
      409,
    );
  }

  const recovered = await recoverTypedDataAddress({
    domain: {
      name: EIP712_DOMAIN.name,
      version: EIP712_DOMAIN.version,
      chainId: EIP712_DOMAIN.chainId,
      verifyingContract: EIP712_DOMAIN.verifyingContract as `0x${string}`,
    },
    types: EIP712_TYPES,
    primaryType: "MilestoneApproval",
    message: {
      programId: BigInt(program.programId),
      milestoneIndex: BigInt(milestone.milestoneIndex),
      milestoneBudget: BigInt(milestone.milestoneBudget),
      evidenceHash: input.evidenceHash as `0x${string}`,
    },
    signature: input.signature as `0x${string}`,
  });

  const signerWallet = recovered.toLowerCase();

  const submitter = await prisma.user.findUnique({
    where: { id: userId },
    select: { walletAddress: true },
  });

  if (!submitter?.walletAddress) {
    throw new AppError("Bind a wallet before submitting signatures", 400);
  }

  if (submitter.walletAddress.toLowerCase() !== signerWallet) {
    throw new AppError(
      "Recovered signer does not match your bound wallet",
      403,
    );
  }

  const roleHash = mapSignerRoleToRoleHash(input.signerRole);
  const hasRoleOnChain = await hasRole(signerWallet, roleHash);

  if (!hasRoleOnChain) {
    throw new AppError(
      `Signer does not hold ${input.signerRole} role on-chain`,
      403,
    );
  }

  try {
    const saved = await txDirect(async (tx) => {
      if (!milestone.evidenceHash) {
        await tx.milestone.update({
          where: { id: milestone.id },
          data: { evidenceHash },
        });
      }

      return tx.milestoneSignature.create({
        data: {
          milestoneId: milestone.id,
          signerWallet,
          signerRole: input.signerRole,
          signature: input.signature,
        },
      });
    });

    return { id: saved.id, signerWallet, signerRole: saved.signerRole };
  } catch (err: any) {
    if (err?.code === "P2002") {
      throw new AppError(
        "A signature for this wallet or role already exists on this milestone",
        409,
      );
    }
    throw err;
  }
}

export async function getSignatures(milestoneId: string) {
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    select: { id: true },
  });

  if (!milestone) throw new AppError("Milestone not found", 404);

  const signatures = await prisma.milestoneSignature.findMany({
    where: { milestoneId },
    select: {
      id: true,
      signerWallet: true,
      signerRole: true,
      signature: true,
      signedAt: true,
    },
    orderBy: { signedAt: "asc" },
  });

  const roles = new Set(signatures.map((s) => s.signerRole));
  const complete =
    roles.has("ADMIN") && roles.has("VALIDATOR") && roles.has("AUDITOR");

  return {
    milestoneId,
    signatures,
    collected: signatures.length,
    required: 3,
    complete,
  };
}

export async function resetSignatures(userId: string, milestoneId: string) {
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: { program: { select: { picId: true } } },
  });

  if (!milestone) throw new AppError("Milestone not found", 404);

  if (milestone.program.picId !== userId) {
    throw new AppError("Only the program PIC can reset signatures", 403);
  }

  if (milestone.status !== "PLANNED") {
    throw new AppError(
      "Cannot reset signatures after milestone is released",
      409,
    );
  }

  const deleted = await txDirect(async (tx) => {
    const del = await tx.milestoneSignature.deleteMany({
      where: { milestoneId },
    });

    await tx.milestone.update({
      where: { id: milestoneId },
      data: { evidenceHash: null },
    });

    return del.count;
  });

  return { milestoneId, deleted };
}
