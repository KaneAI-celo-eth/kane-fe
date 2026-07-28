import { useState } from "react";
import { useChainId, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { erc20Abi, maxUint256, type Address } from "viem";
import { aaveDataProviderAbi } from "../abi/aave";
import { AAVE, USDC_CELO, explorerFor } from "../config/contracts";
import { attributionSuffix } from "../config/attribution";
import { executeAction, type ProposedAction } from "../config/agent";

type Fundable = Extract<ProposedAction, { kind: "supply" | "withdraw" }>;

/**
 * Owner-triggered execution with a JUST-IN-TIME allowance. The owner never pre-approves during
 * register; the first time they move a token, this grants the executor its allowance (owner-signed),
 * then asks kane-be's central agent to run the bounded `execute()`. "The model advises; the chain
 * decides" — the action is still dry-run against the on-chain gate before it sends.
 */
export function ExecuteButton({
  action,
  executor,
  owner,
}: {
  action: Fundable;
  executor: Address;
  owner: Address;
}) {
  const chainId = useChainId();
  const aave = AAVE[chainId];
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  // supply pulls USDC (known); withdraw pulls aUSDC — resolve it from Aave's data provider.
  const { data: reserveTokens } = useReadContract({
    address: aave?.dataProvider,
    abi: aaveDataProviderAbi,
    functionName: "getReserveTokensAddresses",
    args: [USDC_CELO],
    query: { enabled: Boolean(aave) && action.kind === "withdraw" },
  });
  const token: Address | undefined = action.kind === "supply" ? USDC_CELO : reserveTokens?.[0];
  const amount = BigInt(action.amount);

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: "allowance",
    args: [owner, executor],
    query: { enabled: Boolean(token) },
  });
  const needsApprove = allowance !== undefined && allowance < amount;

  const [phase, setPhase] = useState<"idle" | "approving" | "executing">("idle");
  const [result, setResult] = useState<{ txHash?: string; error?: string } | null>(null);

  async function run() {
    if (!token || !publicClient) return;
    setResult(null);
    try {
      // JIT allowance — only when this move actually needs it, signed by the owner.
      if (allowance === undefined || allowance < amount) {
        setPhase("approving");
        const approveHash = await writeContractAsync({
          address: token,
          abi: erc20Abi,
          functionName: "approve",
          args: [executor, maxUint256],
          dataSuffix: attributionSuffix,
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
        await refetchAllowance();
      }
      // agent-signed, policy-bounded execute
      setPhase("executing");
      const res = await executeAction(action, owner);
      if (res.executed && res.txHash) setResult({ txHash: res.txHash });
      else setResult({ error: res.error ?? res.dryRun?.reason ?? "the on-chain gate blocked this action" });
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      setPhase("idle");
    }
  }

  const busy = phase !== "idle";
  const label = busy
    ? phase === "approving"
      ? "Approve in wallet…"
      : "Executing…"
    : needsApprove
      ? "Approve & Execute"
      : "Execute";
  const tokenLabel = action.kind === "supply" ? "USDC" : "aUSDC";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={run}
          disabled={busy || !token}
          className="px-5 py-2.5 bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-40 btn-cut"
        >
          {label}
        </button>
        {needsApprove && !busy && !result && (
          <span className="text-white/40 text-xs">
            Approves {tokenLabel} once (your signature), then the agent executes.
          </span>
        )}
      </div>
      {result?.txHash && (
        <p className="text-white text-sm">
          Done ✓ — tx{" "}
          <a
            href={`${explorerFor(chainId)}/tx/${result.txHash}`}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-white/70 underline underline-offset-4 hover:text-white"
          >
            {result.txHash.slice(0, 10)}…
          </a>
        </p>
      )}
      {result?.error && (
        <p className="text-sm break-words" style={{ color: "#f87171" }}>
          {result.error}
        </p>
      )}
    </div>
  );
}
