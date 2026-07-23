import { parseAbi } from "viem";

// Mirrors kane-be/src/abi.ts (KaneVaultFactory).
export const kaneVaultFactoryAbi = parseAbi([
  "function createVault(address token) returns (address vault)",
  "function vaultOf(address owner, address token) view returns (address)",
  "function vaultCount() view returns (uint256)",
]);
