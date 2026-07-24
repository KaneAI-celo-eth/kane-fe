import { useReadContract } from "wagmi";
import { keccak256, toBytes, type Address } from "viem";
import { kaneExecutorAbi } from "../abi/kaneExecutor";
import { kaneExecutorFactoryAbi } from "../abi/kaneExecutorFactory";

/** `keccak256("MANAGER_ROLE")` — the owner's fund-config role (matches kane-sc). */
export const MANAGER_ROLE = keccak256(toBytes("MANAGER_ROLE"));

/** Resolve the owner's executor via the factory (zero address = none yet). */
export function useExecutorOf(factory: Address | undefined, owner: Address | undefined) {
  return useReadContract({
    address: factory,
    abi: kaneExecutorFactoryAbi,
    functionName: "executorOf",
    args: owner ? [owner] : undefined,
    query: { enabled: Boolean(factory && owner) },
  });
}

/** Read the per-token policy struct (caps + spend counters) for an executor. */
export function useTokenPolicy(executor: Address | undefined, token: Address | undefined) {
  return useReadContract({
    address: executor,
    abi: kaneExecutorAbi,
    functionName: "tokenPolicy",
    args: token ? [token] : undefined,
    query: { enabled: Boolean(executor && token) },
  });
}

/**
 * Resolve an owner's executor and read its status: owner/agent/version/revoked plus
 * whether `owner` holds MANAGER_ROLE. `executor` is undefined until it resolves to a
 * non-zero address.
 */
export function useExecutor(factory: Address | undefined, owner: Address | undefined) {
  const { data: resolved, refetch, isLoading: resolving } = useExecutorOf(factory, owner);
  const executor =
    resolved && resolved !== "0x0000000000000000000000000000000000000000"
      ? (resolved as Address)
      : undefined;

  const readOpts = { query: { enabled: Boolean(executor) } } as const;

  const { data: onchainOwner } = useReadContract({
    address: executor,
    abi: kaneExecutorAbi,
    functionName: "owner",
    ...readOpts,
  });
  const { data: agent } = useReadContract({
    address: executor,
    abi: kaneExecutorAbi,
    functionName: "agent",
    ...readOpts,
  });
  const { data: version } = useReadContract({
    address: executor,
    abi: kaneExecutorAbi,
    functionName: "version",
    ...readOpts,
  });
  const { data: revoked } = useReadContract({
    address: executor,
    abi: kaneExecutorAbi,
    functionName: "revoked",
    ...readOpts,
  });
  const { data: isManager } = useReadContract({
    address: executor,
    abi: kaneExecutorAbi,
    functionName: "hasRole",
    args: owner ? [MANAGER_ROLE, owner] : undefined,
    query: { enabled: Boolean(executor && owner) },
  });

  return {
    executor,
    resolving,
    refetch,
    owner: onchainOwner as Address | undefined,
    agent: agent as Address | undefined,
    version: version as number | undefined,
    revoked: revoked as boolean | undefined,
    isManager: isManager as boolean | undefined,
  };
}
