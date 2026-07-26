export const EIP712_DOMAIN = {
  name: "GovernanceAntiCorruption",
  version: "1",
  chainId: 84532,
  verifyingContract: "0x89AB7D9EBefa836F44c50f51F7d2c2831188421a",
} as const;

export const EIP712_TYPES = {
  MilestoneApproval: [
    { name: "programId", type: "uint256" },
    { name: "milestoneIndex", type: "uint256" },
    { name: "milestoneBudget", type: "uint256" },
    { name: "evidenceHash", type: "bytes32" },
  ],
} as const;
