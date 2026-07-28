import { parseAbi } from "viem";

// Mirrors kane-sc `KaneExecutorFactory` — deploys one KaneExecutor per user behind
// a shared beacon. `createExecutor` makes the caller the executor's owner.
export const kaneExecutorFactoryAbi = parseAbi([
  // one-shot registration policy (deploy + configure in one tx)
  "struct TokenCap { address token; uint128 perTxCap; uint128 budget; uint128 windowCap; uint64 windowDuration; }",
  "struct SelectorPermit { address target; bytes4 selector; bool bindRecipient; uint16 recipientWordIndex; }",
  "struct InitPolicy { TokenCap[] tokens; address[] targets; SelectorPermit[] selectors; bytes4[] forbiddenSelectors; }",
  "function createExecutor() returns (address executor)",
  "function createExecutorWithPolicy(InitPolicy policy) returns (address executor)",
  "function executorOf(address owner) view returns (address)",
  "function executorCount() view returns (uint256)",
  "function beacon() view returns (address)",
  "function admin() view returns (address)",
  "function agent() view returns (address)",
]);
