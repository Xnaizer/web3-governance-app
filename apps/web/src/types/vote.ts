import type { VoteUserMini } from "../services/votesApi";

export interface UnfreezeBallot {
  approve: boolean;
  votedAt: string;
  voter: VoteUserMini | null;
}

export interface UnfreezeVote {
  approveVotes: number;
  rejectVotes: number;
  appealStartedAt: string | null;
  resolved: boolean;
  picWallet: string;
  txHash: string | null;
  ballots: UnfreezeBallot[];
}

export interface FreezeOutcome {
  auditorWallet: string;
  outcome: string;
  frozenAt: string;
  resolvedAt: string | null;
  reason: string | null;
  description: string | null;
  evidenceUrl: string | null;
  txHash: string | null;
}
