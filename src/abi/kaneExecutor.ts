import { parseAbi } from "viem";

// Mirrors kane-sc `KaneExecutor` (v2.1, non-custodial per-user executor). Only the
// surface the console reads/writes is declared here (viem-typed const ABI for wagmi).
export const kaneExecutorAbi = parseAbi([
  // ---- status / role reads ----
  "function owner() view returns (address)",
  "function agent() view returns (address)",
  "function version() view returns (uint32)",
  "function revoked() view returns (bool)",
  "function expiry() view returns (uint64)",
  "function MANAGER_ROLE() view returns (bytes32)",
  "function ADMIN_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function allowedTarget(address target) view returns (bool)",
  "function allowedSelector(address target, bytes4 selector) view returns (bool)",
  // per-token policy struct: (perTxCap, budget, spent, windowCap, windowSpent, windowDuration, windowStart)
  "function tokenPolicy(address token) view returns ((uint128 perTxCap, uint128 budget, uint128 spent, uint128 windowCap, uint128 windowSpent, uint64 windowDuration, uint64 windowStart) policy)",
  "function wouldAllowPull(address token, uint256 amount) view returns (bool ok, string reason)",
  // ---- owner-signed (MANAGER_ROLE) authorize/config writes ----
  "function setAgent(address agent)",
  "function provisionToken(address token, uint128 perTxCap, uint128 budget, uint128 windowCap, uint64 windowDuration)",
  "function setAllowedTarget(address target, bool allowed)",
  "function setAllowedSelector(address target, bytes4 selector, bool allowed, bool bindRecipient, uint16 recipientWordIndex)",
  "function setForbiddenSelector(bytes4 selector, bool forbidden)",
  "function setForbiddenSelectors(bytes4[] selectors, bool forbidden)",
  // ---- batch (OZ MulticallUpgradeable): all config in ONE owner tx; msg.sender preserved so onlyRole holds ----
  "function multicall(bytes[] data) returns (bytes[] results)",
  // ---- agent-signed atomic action (driven by kane-be; declared for completeness) ----
  "function execute((address token, uint256 amount)[] pulls, (address token, address spender, uint256 amount)[] approvals, (address target, uint256 value, bytes data)[] calls, uint32 expectedVersion)",
]);
