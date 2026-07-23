import { parseAbi } from "viem";

// Mirrors kane-be/src/abi.ts (KaneVault).
export const kaneVaultAbi = parseAbi([
  "function agentTransfer(address to, uint256 amount, uint32 expectedVersion, string memo)",
  "function agentSpendCapped(address protocol, uint256 amount, bytes callData, uint32 expectedVersion, string memo)",
  "function wouldAllow(address caller, uint256 amount, uint32 expectedVersion) view returns (bool ok, string reason)",
  "function balance() view returns (uint256)",
  "function remainingBudget() view returns (uint256)",
  "function owner() view returns (address)",
  "function token() view returns (address)",
  "function allowedRecipient(address recipient) view returns (bool)",
  "function allowedProtocol(address protocol) view returns (bool)",
  "function policy() view returns (address agent, uint128 budget, uint128 spent, uint128 perTxCap, uint128 windowCap, uint128 windowSpent, uint64 windowDuration, uint64 windowStart, uint64 expiry, uint32 version, bool revoked)",
]);
