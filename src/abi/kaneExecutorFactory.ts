import { parseAbi } from "viem";

// Mirrors kane-sc `KaneExecutorFactory` — deploys one KaneExecutor per user behind
// a shared beacon. `createExecutor` makes the caller the executor's owner.
export const kaneExecutorFactoryAbi = parseAbi([
  "function createExecutor() returns (address executor)",
  "function executorOf(address owner) view returns (address)",
  "function executorCount() view returns (uint256)",
  "function beacon() view returns (address)",
  "function admin() view returns (address)",
]);
