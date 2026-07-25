import { api } from "../lib/api";
import type { Pagination } from "../types/common";
import type { ProgramStatus } from "../types/program";

interface Envelope<T> {
  data: T;
  error: string | null;
  meta: { pagination?: Pagination };
}

export interface VoteUserMini {
  id: string;
  name: string | null;
  username: string;
  walletAddress: string | null;
  profilePictureURL: string | null;
  role: string;
}

export interface RoleVoteRow {
  voteId: number;
  candidate: string;
  roleToTarget: string;
  voteCount: number;
  isDevote: boolean;
  executed: boolean;
  grantedBy: string;
  submittedAt: string;
  isExpired: boolean;
  txHash?: string | null;
  candidateUser?: VoteUserMini | null;
  grantedByUser?: VoteUserMini | null;
}

export async function fetchRoleVotes(
  params: { page?: number; limit?: number } = {},
) {
  const res = await api.get<Envelope<RoleVoteRow[]>>("/public/votes", {
    params: { limit: 12, ...params },
  });
  return { rows: res.data.data, pagination: res.data.meta.pagination };
}

export interface VoteBallot {
  votedAt: string;
  voter: VoteUserMini | null;
}

export type RoleVoteDetail = RoleVoteRow & { ballots?: VoteBallot[] };

export async function fetchRoleVote(voteId: number) {
  const res = await api.get<Envelope<RoleVoteDetail>>(
    `/public/votes/${voteId}`,
  );
  return res.data.data;
}

export interface VoteProgramMini {
  programId: number;
  title: string | null;
  status: ProgramStatus;
  totalBudget: string;
  picWallet: string;
  pic: VoteUserMini | null;
}

export interface UnfreezeVoteRow {
  id: string;
  programId: number;
  picWallet: string;
  approveVotes: number;
  rejectVotes: number;
  appealStartedAt: string | null;
  resolved: boolean;
  createdAt: string;
  _count?: { ballots: number };
  program: VoteProgramMini | null;
}

export async function fetchUnfreezeVotes(
  params: { page?: number; limit?: number } = {},
) {
  const res = await api.get<Envelope<UnfreezeVoteRow[]>>(
    "/public/unfreeze-votes",
    { params: { limit: 12, ...params } },
  );
  return { rows: res.data.data, pagination: res.data.meta.pagination };
}

export interface UnfreezeBallot {
  approve: boolean;
  votedAt: string;
  voter: VoteUserMini | null;
}

export type UnfreezeVoteDetail = UnfreezeVoteRow & {
  txHash?: string | null;
  ballots?: UnfreezeBallot[];
};

export async function fetchUnfreezeVote(programId: number) {
  const res = await api.get<Envelope<UnfreezeVoteDetail>>(
    `/public/unfreeze-votes/${programId}`,
  );
  return res.data.data;
}

export interface ProposalVoteRow {
  programId: number;
  voteCount: number;
  lastVotedAt: string;
  program: VoteProgramMini | null;
}

export async function fetchProposalVotes(
  params: { page?: number; limit?: number } = {},
) {
  const res = await api.get<Envelope<ProposalVoteRow[]>>(
    "/public/proposal-votes",
    { params: { limit: 12, ...params } },
  );
  return { rows: res.data.data, pagination: res.data.meta.pagination };
}