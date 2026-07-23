import { useReadContract } from "wagmi";
import type { Address } from "viem";
import { kaneVaultAbi } from "../abi/kaneVault";
import { kaneVaultFactoryAbi } from "../abi/kaneVaultFactory";

/** Resolve the caller's vault for a token via the factory (zero address = none yet). */
export function useVaultOf(
  factory: Address | undefined,
  owner: Address | undefined,
  token: Address | undefined,
) {
  return useReadContract({
    address: factory,
    abi: kaneVaultFactoryAbi,
    functionName: "vaultOf",
    args: owner && token ? [owner, token] : undefined,
    query: { enabled: Boolean(factory && owner && token) },
  });
}

export function useVaultPolicy(vault: Address | undefined) {
  return useReadContract({
    address: vault,
    abi: kaneVaultAbi,
    functionName: "policy",
    query: { enabled: Boolean(vault) },
  });
}

export function useVaultBalance(vault: Address | undefined) {
  return useReadContract({
    address: vault,
    abi: kaneVaultAbi,
    functionName: "balance",
    query: { enabled: Boolean(vault) },
  });
}
