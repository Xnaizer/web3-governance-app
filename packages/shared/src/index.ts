export * from "./constants/eip712";
export * from "./constants/contract";
export * from "./utils/programHash";
export * from "./constants/voting";

import Web3GovernanceArtifact from "./abi/Web3Governance.json";
import RupiahTokenArtifact from "./abi/RupiahToken.json";
import TrustedGatewayBurnerArtifact from "./abi/TrustedGatewayBurner.json";

export const Web3GovernanceABI =
  Web3GovernanceArtifact.abi as unknown as readonly unknown[];
export const RupiahTokenABI =
  RupiahTokenArtifact.abi as unknown as readonly unknown[];
export const TrustedGatewayBurnerABI =
  TrustedGatewayBurnerArtifact.abi as unknown as readonly unknown[];
