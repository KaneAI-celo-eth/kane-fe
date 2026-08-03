import { useState } from "react";
import { useChainId, usePublicClient, useReadContracts, useWriteContract } from "wagmi";
import { encodeFunctionData, type Address, type Hex } from "viem";
import { kaneExecutorAbi } from "../abi/kaneExecutor";
import { UBESWAP_SWAP_SELECTOR } from "../abi/ubeswap";
import {
  MENTO,
  MENTO_RECIPIENT_WORD_INDEX,
  MENTO_STABLES,
  MENTO_SWAP_SELECTOR,
  UBESWAP,
  explorerFor,
} from "../config/contracts";
import { attributionSuffix } from "../config/attribution";
import { friendlyTxError } from "../config/errors";

const CAP_18 = 1_000_000_000_000_000_000_000n; // 1000e18 — mirrors AuthorizeAgent.buildPolicy

/** A swap venue as a self-contained policy bundle: the router target, its recipient-bound swap
 *  selector(s), and the pull tokens it needs. Adding a future venue = append one entry here. */
interface Venue {
  name: string;
  target: Address;
  selectors: { selector: Hex; word: number }[];
  tokens: Address[];
}

/** The canonical venues an executor should allowlist. Aave (supply/withdraw) is set atomically at
 *  registration and its aToken is resolved on-chain, so it's not part of this additive sync — this
 *  covers the swap venues, which is where new venues get added over time. */
function canonicalVenues(chainId: number): Venue[] {
  const out: Venue[] = [];
  const ube = UBESWAP[chainId]?.router;
  const mento = MENTO[chainId]?.router;
  if (ube)
    out.push({
      name: "Ubeswap V2",
      target: ube,
      selectors: [{ selector: UBESWAP_SWAP_SELECTOR, word: 3 }],
      tokens: [],
    });
  if (mento)
    out.push({
      name: "Mento V3",
      target: mento,
      selectors: [{ selector: MENTO_SWAP_SELECTOR, word: MENTO_RECIPIENT_WORD_INDEX }],
      tokens: Object.values(MENTO_STABLES),
    });
  return out;
}

/**
 * One-click, owner-signed policy sync for an EXISTING executor: adds every canonical swap venue
 * the executor is missing (the Mento V3 Router + local stables today; whatever is appended to
 * {@link canonicalVenues} tomorrow) in a single attribution-tagged `multicall`. Each swap selector
 * binds its recipient to the owner (word 3), so output can never leave the owner.
 *
 * This is deliberately OWNER-signed — only the owner holds MANAGER_ROLE. The deployer/agent cannot
 * (and must not) mutate an executor's allowlist: that would make KaneAI custodial (see decision
 * 0007). Renders nothing once the executor already has every venue.
 */
export function UpdatePolicy({ executor }: { executor: Address }) {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const venues = canonicalVenues(chainId);

  const [signing, setSigning] = useState(false);
  const [hash, setHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Batch-read which venue targets are already allowlisted on this executor.
  const { data: allowed, refetch } = useReadContracts({
    contracts: venues.map((v) => ({
      address: executor,
      abi: kaneExecutorAbi,
      functionName: "allowedTarget" as const,
      args: [v.target] as const,
    })),
    query: { enabled: venues.length > 0 },
  });

  const missing = venues.filter((_, i) => allowed?.[i]?.result === false);

  // Nothing to sync (fully up to date, or reads not in yet).
  if (missing.length === 0) return null;

  async function sync() {
    if (!publicClient) return;
    setError(null);
    const inner: Hex[] = [];
    for (const v of missing) {
      inner.push(encodeFunctionData({ abi: kaneExecutorAbi, functionName: "setAllowedTarget", args: [v.target, true] }));
      for (const s of v.selectors) {
        inner.push(
          encodeFunctionData({
            abi: kaneExecutorAbi,
            functionName: "setAllowedSelector",
            args: [v.target, s.selector, true, true, s.word],
          }),
        );
      }
      for (const t of v.tokens) {
        inner.push(
          encodeFunctionData({
            abi: kaneExecutorAbi,
            functionName: "provisionToken",
            args: [t, CAP_18, CAP_18, 0n, 0n],
          }),
        );
      }
    }
    try {
      setSigning(true);
      const tx = await writeContractAsync({
        address: executor,
        abi: kaneExecutorAbi,
        functionName: "multicall",
        args: [inner],
        dataSuffix: attributionSuffix,
      });
      setHash(tx);
      await publicClient.waitForTransactionReceipt({ hash: tx });
      await refetch();
    } catch (e) {
      setError(friendlyTxError(e));
    } finally {
      setSigning(false);
    }
  }

  const names = missing.map((m) => m.name).join(" + ");
  return (
    <div className="flex flex-col gap-2 border border-white/12 btn-cut-sm px-4 py-3 bg-black/40 backdrop-blur-md">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-white/80 text-sm">Update executor policy</p>
          <p className="text-white/45 text-xs mt-0.5 max-w-xl leading-relaxed">
            Your executor is missing {names}. One signature adds {missing.length > 1 ? "these venues" : "this venue"}{" "}
            (routers + local stablecoins, swap output bound to you). New executors already include everything.
          </p>
        </div>
        <button
          onClick={sync}
          disabled={signing}
          className="px-5 py-2.5 bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-40 btn-cut shrink-0"
        >
          {signing ? "Confirm in wallet…" : `Add ${names}`}
        </button>
      </div>
      {hash && (
        <p className="text-white/45 text-xs">
          tx:{" "}
          <a
            href={`${explorerFor(chainId)}/tx/${hash}`}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-white/60 underline underline-offset-4 hover:text-white"
          >
            {hash.slice(0, 10)}…
          </a>
        </p>
      )}
      {error && (
        <p className="text-xs break-words" style={{ color: "#f87171" }}>
          {error}
        </p>
      )}
    </div>
  );
}
