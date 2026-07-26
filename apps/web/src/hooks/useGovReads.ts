import { useReadContract, useReadContracts, useAccount } from "wagmi";
import { governanceContract, CHAIN_ID } from "../config/contracts";

export function bftThreshold(n: number): number {
  return Math.floor((2 * n) / 3) + 1;
}

const base = { ...governanceContract, chainId: CHAIN_ID } as const;

function num(v: unknown): number {
  return typeof v === "bigint" ? Number(v) : Number(v ?? 0);
}

export function useValidatorThreshold() {
  const { data } = useReadContract({
    ...base,
    functionName: "totalValidatorsCount",
  });
  const total = num(data);
  return { total, threshold: total > 0 ? bftThreshold(total) : 0 };
}

export function useAdminThreshold() {
  const { data } = useReadContract({
    ...base,
    functionName: "totalAdminsCount",
  });
  const total = num(data);
  return { total, threshold: total > 0 ? bftThreshold(total) : 0 };
}

export function useProposalVoteCount(programId: number) {
  const { data } = useReadContract({
    ...base,
    functionName: "proposalVotes",
    args: [BigInt(programId)],
    query: { enabled: programId > 0 },
  });
  return num(data);
}

export function useMyProposalVotes(programIds: number[]) {
  const { address } = useAccount();

  const { data } = useReadContracts({
    contracts: programIds.map((id) => ({
      ...base,
      functionName: "hasVotedProposal",
      args: [BigInt(id), address as `0x${string}`],
    })),
    query: { enabled: !!address && programIds.length > 0 },
  });

  const voted = new Set<number>();
  (data ?? []).forEach((r, i) => {
    if (r.status === "success" && r.result === true) {
      voted.add(programIds[i]);
    }
  });
  return voted;
}

export function useRoleVoteCount(voteId: number) {
  const { data } = useReadContract({
    ...base,
    functionName: "roleVotes",
    args: [BigInt(voteId)],
    query: { enabled: voteId >= 0 },
  });
  const tuple = data as readonly unknown[] | undefined;
  return tuple ? num(tuple[2]) : 0;
}

export function useUnfreezeAppealVotes(programId: number) {
  const { data } = useReadContract({
    ...base,
    functionName: "unfreezeAppeals",
    args: [BigInt(programId)],
    query: { enabled: programId > 0 },
  });
  const tuple = data as readonly unknown[] | undefined;
  return {
    approve: tuple ? num(tuple[0]) : 0,
    reject: tuple ? num(tuple[1]) : 0,
    resolved: tuple ? Boolean(tuple[3]) : false,
  };
}