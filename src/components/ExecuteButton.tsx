import { useEffect, useState } from "react";
import { erc20Abi, type Address } from "viem";
import { useChainId, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { kaneExecutorAbi } from "../abi/kaneExecutor";
import { explorerFor } from "../config/contracts";
import { attributionSuffix } from "../config/attribution";
import { buildExecute, type BuiltExecute, type ProposedAction } from "../config/agent";

type Fundable = Extract<ProposedAction, { kind: "supply" | "withdraw" | "swap" }>;

/**
 * MANUAL execution — the OWNER drives their own executor (two owner signatures: approve the exact
 * input amount, then call execute). The agent path is reserved for autonomous/scheduled actions.
 * The execute() payload (pull → allowlisted Aave/Ubeswap call, output bound to the owner) is built
 * server-side (/build) so path resolution + slippage live in one place; the owner signs it.
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
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [built, setBuilt] = useState<BuiltExecute | null>(null);
  const [buildErr, setBuildErr] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "approving" | "executing">("idle");
  const [result, setResult] = useState<{ txHash?: string; error?: string } | null>(null);

  // Ask the gateway to build the execute() payload for this action (once).
  useEffect(() => {
    let live = true;
    setBuilt(null);
    setBuildErr(null);
    void buildExecute(action, owner)
      .then((b) => live && setBuilt(b))
      .catch((e) => live && setBuildErr(e instanceof Error ? e.message : String(e)));
    return () => {
      live = false;
    };
  }, [action, owner]);

  const token = built?.inputToken;
  const amount = built?.inputAmount;
  const decimals = built?.inputToken === undefined ? 6 : action.kind === "swap" ? 18 : 6;

  const { data: balance } = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [owner],
    query: { enabled: Boolean(token) },
  });
  const insufficient = balance !== undefined && amount !== undefined && balance < amount;
  const fmt = (v: bigint) => (Number(v) / 10 ** decimals).toLocaleString(undefined, { maximumFractionDigits: 4 });
  const tokenLabel =
    action.kind === "supply" ? "USDC" : action.kind === "withdraw" ? "aUSDC" : action.from;

  async function run() {
    if (!built || !token || amount === undefined || !publicClient) return;
    setResult(null);
    try {
      // 1) owner approves the EXACT input amount (MetaMask)
      setPhase("approving");
      const approveHash = await writeContractAsync({
        address: token,
        abi: erc20Abi,
        functionName: "approve",
        args: [executor, amount],
        dataSuffix: attributionSuffix,
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      // 2) owner calls execute() on their OWN executor with the server-built payload (MetaMask)
      setPhase("executing");
      const execHash = await writeContractAsync({
        address: executor,
        abi: kaneExecutorAbi,
        functionName: "execute",
        args: [built.pulls, built.approvals, built.calls, built.version],
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

  if (buildErr) {
    return (
      <p className="text-xs break-words" style={{ color: "#f87171" }}>
        Can't build this move — {buildErr}
      </p>
    );
  }

  const busy = phase !== "idle";
  const ready = Boolean(built && token && amount !== undefined);
  const label = busy
    ? phase === "approving"
      ? "Approve in wallet…"
      : "Confirm execute…"
    : !ready
      ? "Preparing…"
      : "Approve & Execute";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={run}
          disabled={busy || !ready || insufficient}
          className="px-5 py-2.5 bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-40 btn-cut"
        >
          {label}
        </button>
        {balance !== undefined &&
          amount !== undefined &&
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
