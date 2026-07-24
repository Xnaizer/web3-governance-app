import { api } from "../lib/api";
import type { ProgramListItem, ProgramDetail } from "../types/program";
import type { Pagination, DisplayTab } from "../types/common";

interface Envelope<T> {
  data: T;
  error: string | null;
  meta: { pagination?: Pagination };
}

export interface CreateProgramInput {
  title: string;
  description: string;
  totalBudget: string;
  milestoneCount: number;
  province: string;
  regency: string;
  district?: string;
  locationAddress: string;
  executorName: string;
  executorRegistration: string;
  category: string;
  institutionName: string;
  fiscalYear: number;
  plannedStartDate?: string;
  plannedEndDate?: string;
  milestones: {
    title: string;
    description?: string;
    milestoneBudget: string;
  }[];
}

export async function createProgram(input: CreateProgramInput) {
  const res = await api.post<
    Envelope<{ programId: number; programHash: string }>
  >("/programs", input);
  return res.data.data;
}

export async function getOnchainPayload(programId: number) {
  const res = await api.get<
    Envelope<{ programId: number; programHash: string; milestoneCount: number }>
  >(`/programs/${programId}/onchain-payload`);
  return res.data.data;
}

export async function getProgramDetailAuthed(programId: number) {
  const res = await api.get<Envelope<ProgramDetail>>(`/programs/${programId}`);
  return res.data.data;
}

export async function listProgramsAuthed(
  params: {
    tab?: DisplayTab;
    status?: string;
    page?: number;
    limit?: number;
  } = {},
) {
  const res = await api.get<Envelope<ProgramListItem[]>>("/programs", {
    params,
  });
  return { programs: res.data.data, pagination: res.data.meta.pagination };
}

export interface MyProposalVoteRow {
  votedAt: string;
  txHash: string | null;
  program: ProgramListItem;
}

/** The connected validator's full proposal-vote history (all statuses). */
export async function getMyProposalVotes() {
  const res = await api.get<Envelope<MyProposalVoteRow[]>>(
    "/programs/my-proposal-votes",
  );
  return res.data.data;
}
