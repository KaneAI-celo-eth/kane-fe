import { useState } from "react";
import { encodeFunctionData, erc20Abi, type Address } from "viem";
import { useChainId, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { kaneExecutorAbi } from "../abi/kaneExecutor";
import { aaveDataProviderAbi, aavePoolAbi } from "../abi/aave";
import { AAVE, USDC_CELO, explorerFor } from "../config/contracts";
import { attributionSuffix } from "../config/attribution";
import type { ProposedAction } from "../config/agent";

type Fundable = Extract<ProposedAction, { kind: "supply" | "withdraw" }>;

/**
 * MANUAL execution — the OWNER drives their own executor (two owner signatures: approve the exact
 * amount, then call execute). The agent path is reserved for autonomous/scheduled actions; here the
 * user is in the loop, so the user signs. Every move approves precisely this amount (no standing
 * allowance), and the executor binds the position back to the owner + sweeps any residual.
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

  // withdraw pulls aUSDC — resolve it; supply pulls USDC (known).
  const { data: reserveTokens } = useReadContract({
    address: aave?.dataProvider,
    abi: aaveDataProviderAbi,
    functionName: "getReserveTokensAddresses",
    args: [USDC_CELO],
    query: { enabled: Boolean(aave) && action.kind === "withdraw" },
  });
  const aUsdc = reserveTokens?.[0];
  const token: Address | undefined = action.kind === "supply" ? USDC_CELO : aUsdc;
  const amount = BigInt(action.amount);

  const { data: version } = useReadContract({
    address: executor,
    abi: kaneExecutorAbi,
    functionName: "version",
  });

  const { data: balance } = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [owner],
    query: { enabled: Boolean(token) },
  });
  const insufficient = balance !== undefined && balance < amount;
  const fmt = (v: bigint) => (Number(v) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 });
  const tokenLabel = action.kind === "supply" ? "USDC" : "aUSDC";

  const [phase, setPhase] = useState<"idle" | "approving" | "executing">("idle");
  const [result, setResult] = useState<{ txHash?: string; error?: string } | null>(null);

  /** The execute() payload (mirrors kane-be buildRebalance): pull → allowlisted Aave call, output
   *  bound to the owner. */
  function buildArgs() {
    const pool = aave!.pool;
    if (action.kind === "supply") {
      const data = encodeFunctionData({
        abi: aavePoolAbi,
        functionName: "supply",
        args: [USDC_CELO, amount, owner, 0],
      });
      return {
        pulls: [{ token: USDC_CELO, amount }],
        approvals: [{ token: USDC_CELO, spender: pool, amount }],
        calls: [{ target: pool, value: 0n, data }],
      } as const;
    }
    const data = encodeFunctionData({
      abi: aavePoolAbi,
      functionName: "withdraw",
      args: [USDC_CELO, amount, owner],
    });
    return {
      pulls: [{ token: aUsdc!, amount }],
      approvals: [] as { token: Address; spender: Address; amount: bigint }[],
      calls: [{ target: pool, value: 0n, data }],
    } as const;
  }

  async function run() {
    if (!token || !publicClient || version === undefined) return;
    setResult(null);
    try {
      // 1) owner approves the EXACT amount (MetaMask)
      setPhase("approving");
      const approveHash = await writeContractAsync({
        address: token,
        abi: erc20Abi,
        functionName: "approve",
        args: [executor, amount],
        dataSuffix: attributionSuffix,
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      // 2) owner calls execute() on their OWN executor (MetaMask) — policy-bounded, bound to owner
      setPhase("executing");
      const { pulls, approvals, calls } = buildArgs();
      const execHash = await writeContractAsync({
        address: executor,
        abi: kaneExecutorAbi,
        functionName: "execute",
        args: [pulls, approvals, calls, version],
        dataSuffix: attributionSuffix,
      });
      await publicClient.waitForTransactionReceipt({ hash: execHash });
      setResult({ txHash: execHash });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setResult({ error: msg.length > 200 ? msg.slice(0, 200) + "…" : msg });
    } finally {
      setPhase("idle");
    }
  }

  const busy = phase !== "idle";
  const label = busy
    ? phase === "approving"
      ? "Approve in wallet…"
      : "Confirm execute…"
    : "Approve & Execute";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={run}
          disabled={busy || !token || insufficient || version === undefined}
          className="px-5 py-2.5 bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-40 btn-cut"
        >
          {label}
        </button>
        {balance !== undefined &&
          (insufficient ? (
            <span className="text-xs" style={{ color: "#f87171" }}>
              You have {fmt(balance)} {tokenLabel} — need {fmt(amount)} to {action.kind}.
            </span>
          ) : (
            <span className="text-white/40 text-xs">
              Balance: {fmt(balance)} {tokenLabel} · you sign approve + execute
            </span>
          ))}
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
