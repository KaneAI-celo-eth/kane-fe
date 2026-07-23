import { useWriteContract } from "wagmi";
import type { Address } from "viem";
import { kaneVaultFactoryAbi } from "../abi/kaneVaultFactory";
import { attributionSuffix } from "../config/attribution";

/** Create a vault via the factory, tagged with KaneAI's attribution suffix. */
export function useCreateVault() {
  const { mutate: writeContract, data: hash, isPending, error } = useWriteContract();

  function createVault(factory: Address, token: Address) {
    writeContract({
      address: factory,
      abi: kaneVaultFactoryAbi,
      functionName: "createVault",
      args: [token],
      dataSuffix: attributionSuffix,
    });
  }

  return { createVault, hash, isPending, error };
}
