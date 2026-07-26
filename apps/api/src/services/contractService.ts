import { cacheAside } from "../lib/cache";
import { publicClient } from "../lib/viem";
import {
  Web3GovernanceABI,
  CONTRACT_ADDRESS,
  TrustedGatewayBurnerABI,
} from "@repo/shared";

export interface OnChainProposal {
  programHash: string;
  picWallet: string;
  totalBudget: bigint;
  currentAllocatedBalance: bigint;
  totalAllocatedSoFar: bigint;
  submittedAt: bigint;
  milestoneCount: bigint;
  currentMilestone: bigint;
  status: number;
}

export interface OnChainRedemption {
  pic: string;
  amount: bigint;
  createdAt: bigint;
  status: number; 
}

export const PROPOSAL_STATUS_BY_INDEX = [
  "PENDING",
  "APPROVED",
  "DRAWABLE",
  "MILESTONE_ACHIEVED",
  "FROZEN",
  "COMPLETED",
  "FRAUD_CONFIRMED",
] as const;

const ZERO_HASH =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

export async function getValidatorCount(): Promise<number> {
  return cacheAside("onchain:validatorCount", 300, async () => {
     console.time("contract:totalValidatorsCount");
     const result = await publicClient.readContract({
      address: CONTRACT_ADDRESS.web3Governance as `0x${string}`,
      abi: Web3GovernanceABI,
      functionName: "totalValidatorsCount",
     });
     console.timeEnd("contract:totalValidatorsCount");
     return Number(result);
   });
}

export async function hasRole(
  account: string,
  roleHash: `0x${string}`,
): Promise<boolean> {
  const result = await publicClient.readContract({
    address: CONTRACT_ADDRESS.web3Governance as `0x${string}`,
    abi: Web3GovernanceABI,
    functionName: "hasRole",
    args: [roleHash, account as `0x${string}`],
  });

  return Boolean(result);
}

export async function getOnChainProposal(
  programId: number,
): Promise<OnChainProposal | null> {
  const result = (await publicClient.readContract({
    address: CONTRACT_ADDRESS.web3Governance as `0x${string}`,
    abi: Web3GovernanceABI,
    functionName: "proposals",
    args: [BigInt(programId)],
  })) as any;

  const programHash: string = result.programHash ?? result[0];
  if (!programHash || programHash === ZERO_HASH) return null;

  return {
    programHash,
    picWallet: result.picWallet ?? result[1],
    totalBudget: result.totalBudget ?? result[2],
    currentAllocatedBalance: result.currentAllocatedBalance ?? result[3],
    totalAllocatedSoFar: result.totalAllocatedSoFar ?? result[4],
    submittedAt: result.submittedAt ?? result[5],
    milestoneCount: result.milestoneCount ?? result[6],
    currentMilestone: result.currentMilestone ?? result[7],
    status: Number(result.status ?? result[8]),
  };
}

export async function getRedemptionNonce(): Promise<number> {
  const result = await publicClient.readContract({
    address: CONTRACT_ADDRESS.trustedGatewayBurner as `0x${string}`,
    abi: TrustedGatewayBurnerABI,
    functionName: "redemptionNonce",
  });

  return Number(result);
}

export async function getOnChainRedemption(
  id: number,
): Promise<OnChainRedemption | null> {
  const result = (await publicClient.readContract({
    address: CONTRACT_ADDRESS.trustedGatewayBurner as `0x${string}`,
    abi: TrustedGatewayBurnerABI,
    functionName: "getRedemption",
    args: [BigInt(id)],
  })) as any;

  const status = Number(result.status ?? result[3]);
  if (status === 0) return null;

  return {
    pic: result.pic ?? result[0],
    amount: result.amount ?? result[1],
    createdAt: result.createdAt ?? result[2],
    status,
  };
}
