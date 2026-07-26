import type { Integrity, DisplayTab } from "./common";
import type { Milestone } from "./milestone";
import type { FreezeOutcome, UnfreezeVote } from "./vote";
import type { VoteUserMini } from "../services/votesApi";

export type ProgramStatus =
  | "PENDING"
  | "APPROVED"
  | "DRAWABLE"
  | "MILESTONE_ACHIEVED"
  | "FROZEN"
  | "COMPLETED"
  | "FRAUD_CONFIRMED";

export interface ProgramListItem {
  programId: number;
  programHash: string;
  picWallet: string;
  totalBudget: string;
  totalAllocatedSoFar: string;
  milestoneCount: number;
  currentMilestone: number;
  status: ProgramStatus;
  title: string | null;
  description: string | null;
  province: string | null;
  regency: string | null;
  district: string | null;
  locationAddress: string | null;
  executorName: string | null;
  executorRegistration: string | null;
  category: string | null;
  institutionName: string | null;
  fiscalYear: number | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  integrity: Integrity;
  displayTab: DisplayTab;
  isOrphan: boolean;
  isOnChain: boolean;
  txHash: string | null;
  submittedAt: string | null;
  createdAt: string;
  images?: ProgramImage[];
  pic?: ProgramPic | null;
}

export interface ProgramImage {
  id: string;
  url: string;
}

export interface ProgramPic {
  id: string;
  name: string | null;
  username: string;
  profilePictureURL: string | null;
  reputationScore: number;
  role: string;
}

export interface ProposalVoter {
  wallet: string;
  votedAt: string;
  txHash: string | null;
  user: VoteUserMini | null;
}

export interface ProgramDetail extends ProgramListItem {
  milestones: Milestone[];
  withdrawals: Withdrawal[];
  freezeOutcome: FreezeOutcome | null;
  unfreezeVote: UnfreezeVote | null;
  proposalVoters: ProposalVoter[];
}

export interface Withdrawal {
  id: string;
  amount: string;
  recipientName: string | null;
  description: string | null;
  timestamp: string;
  txHash: string | null;
  receiptUrl: string | null;
}