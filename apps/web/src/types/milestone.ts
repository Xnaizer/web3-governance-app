import type { SignerRole } from "./common";

export interface MilestoneSignature {
  id: string;
  signerWallet: string;
  signerRole: SignerRole;
  signedAt: string;
}

export interface Milestone {
  id: string;
  title: string | null;
  description: string | null;
  status: string;
  milestoneIndex: number;
  milestoneBudget: string;
  evidenceURL: string | null;
  evidenceHash: string | null;
  createdAt: string;
  signatures: MilestoneSignature[];
}
