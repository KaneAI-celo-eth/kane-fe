import { useWriteContract } from "wagmi";
import type { Address } from "viem";
import { kaneExecutorFactoryAbi } from "../abi/kaneExecutorFactory";
import { attributionSuffix } from "../config/attribution";

/** Create the caller's executor via the factory, tagged with KaneAI's attribution suffix. */
export function useCreateExecutor() {
  const { mutate: writeContract, data: hash, isPending, error } = useWriteContract();

  function createExecutor(factory: Address) {
    writeContract({
      address: factory,
      abi: kaneExecutorFactoryAbi,
      functionName: "createExecutor",
      dataSuffix: attributionSuffix,
    });
  }

  return { createExecutor, hash, isPending, error };
}
