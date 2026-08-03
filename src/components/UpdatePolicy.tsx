import { useState } from "react";
import { createPortal } from "react-dom";
import { useChainId, usePublicClient, useReadContracts, useWriteContract } from "wagmi";
import { encodeFunctionData, type Address, type Hex } from "viem";
import { kaneExecutorAbi } from "../abi/kaneExecutor";
import { UBESWAP_SWAP_SELECTOR } from "../abi/ubeswap";
import {
  MENTO,
  MENTO_RECIPIENT_WORD_INDEX,
  MENTO_STABLES,
  MENTO_SWAP_SELECTOR,
  MOOLA,
  MOOLA_DEPOSIT_SELECTOR,
  MOOLA_TOKENS,
  MOOLA_WITHDRAW_SELECTOR,
  STCELO,
  STCELO_DEPOSIT_SELECTOR,
  STCELO_TOKENS,
  UBESWAP,
  UNISWAP_RECIPIENT_WORD_INDEX,
  UNISWAP_SWAP_SELECTOR,
  UNISWAP_V3,
  explorerFor,
} from "../config/contracts";
import { attributionSuffix } from "../config/attribution";
import { friendlyTxError } from "../config/errors";

const CAP_18 = 1_000_000_000_000_000_000_000n; // 1000e18 — mirrors AuthorizeAgent.buildPolicy

/** A swap venue as a self-contained policy bundle: the router target, its recipient-bound swap
 *  selector(s), and the pull tokens it needs. Adding a future venue = append one entry here. */
interface Venue {
  name: string;
  /** One-line description shown in the confirm modal. */
  desc: string;
  target: Address;
  selectors: { selector: Hex; word: number; bind?: boolean }[]; // bind defaults to true
  tokens: Address[];
}

/** The canonical venues an executor should allowlist. Aave (supply/withdraw) is set atomically at
 *  registration and its aToken is resolved on-chain, so it's not part of this additive sync — this
 *  covers the swap venues, which is where new venues get added over time.
 *
 *  ⚠️ KEEP IN SYNC WITH `AuthorizeAgent.buildPolicy` (the register-time policy). Adding a new venue
 *  means editing BOTH: `buildPolicy` so NEW executors get it at registration (they then never see
 *  the Update-policy banner), and here so EXISTING executors are prompted to add it. Update only
 *  this one and new users would see the banner immediately after registering. */
function canonicalVenues(chainId: number): Venue[] {
  const out: Venue[] = [];
  const ube = UBESWAP[chainId]?.router;
  const mento = MENTO[chainId]?.router;
  const uni = UNISWAP_V3[chainId]?.router;
  if (ube)
    out.push({
      name: "Ubeswap V2",
      desc: "Swap venue — Mento stablecoins & CELO pools.",
      target: ube,
      selectors: [{ selector: UBESWAP_SWAP_SELECTOR, word: 3 }],
      tokens: [],
    });
  if (mento)
    out.push({
      name: "Mento V3",
      desc: "Swap venue — the local-currency stables (NGNm, COPm, BRLm, …).",
      target: mento,
      selectors: [{ selector: MENTO_SWAP_SELECTOR, word: MENTO_RECIPIENT_WORD_INDEX }],
      tokens: Object.values(MENTO_STABLES),
    });
  if (uni)
    // Uniswap V3 trades the already-provisioned tokens — just the router + swap selector.
    out.push({
      name: "Uniswap V3",
      desc: "Swap venue — the deepest DEX on Celo, always-on.",
      target: uni,
      selectors: [{ selector: UNISWAP_SWAP_SELECTOR, word: UNISWAP_RECIPIENT_WORD_INDEX }],
      tokens: [],
    });
  const moola = MOOLA[chainId]?.pool;
  if (moola)
    // Moola Market (lending): deposit + withdraw both bind the recipient at word 2. Provision CELO
    // + the mTokens (USDm/EURm/BRLm assets are already provisioned via the Mento set).
    out.push({
      name: "Moola Market",
      desc: "Lending — supply/withdraw USDm, EURm, CELO, BRLm.",
      target: moola,
      selectors: [
        { selector: MOOLA_DEPOSIT_SELECTOR, word: 2 },
        { selector: MOOLA_WITHDRAW_SELECTOR, word: 2 },
      ],
      tokens: [...MOOLA_TOKENS],
    });
  const stcelo = STCELO[chainId]?.manager;
  if (stcelo)
    // stCELO staking: deposit() mints to msg.sender (NOT recipient-bound) → bind:false; the minted
    // stCELO is swept to the owner. Provision CELO (funds the native deposit) + stCELO.
    out.push({
      name: "stCELO staking",
      desc: "Liquid staking — stake CELO, receive stCELO.",
      target: stcelo,
      selectors: [{ selector: STCELO_DEPOSIT_SELECTOR, word: 0, bind: false }],
      tokens: [...STCELO_TOKENS],
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
  const [open, setOpen] = useState(false);

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
            args: [v.target, s.selector, true, s.bind ?? true, s.word],
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

  const count = missing.length;
  return (
    <>
      <div className="flex flex-col gap-2 border border-white/12 btn-cut-sm px-4 py-3 bg-black/40 backdrop-blur-md">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-white/80 text-sm">Update executor policy</p>
            <p className="text-white/45 text-xs mt-0.5 max-w-xl leading-relaxed">
              {count} new {count > 1 ? "venues are" : "venue is"} available for your executor. One
              signature adds {count > 1 ? "them" : "it"}. New executors already include everything.
            </p>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="px-5 py-2.5 bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors btn-cut shrink-0"
          >
            Update policy
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
      </div>

      {/* Full-screen confirm modal — portaled to <body> so it escapes the console's backdrop-filter
          containing block (a `fixed` child of a backdrop-blurred ancestor is clipped to that ancestor). */}
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[100] bg-black font-inter anim-fade flex flex-col overflow-y-auto">
            {/* top bar */}
            <div className="flex items-center justify-between px-6 md:px-12 py-6 shrink-0">
              <span className="text-white/60 text-[10px] md:text-xs tracking-[0.4em] font-light">
                K A N E A I
              </span>
              <button
                onClick={() => !signing && setOpen(false)}
                disabled={signing}
                aria-label="Close"
                className="text-white/50 hover:text-white text-2xl leading-none disabled:opacity-40"
              >
                ✕
              </button>
            </div>

            {/* centered content */}
            <div className="flex-1 flex items-center justify-center px-6 py-8">
              <div className="w-full max-w-xl">
                <p className="text-white/45 text-[11px] tracking-[0.18em] uppercase mb-3">Update executor policy</p>
                <h1 className="text-white text-4xl md:text-5xl font-normal tracking-[-0.03em]">
                  Add {count} new {count > 1 ? "venues" : "venue"}
                </h1>
                <p className="text-white/55 text-sm md:text-base mt-4 leading-relaxed max-w-lg">
                  One owner signature allowlists these on your executor (routers/pools + their tokens;
                  swap output stays bound to you). You keep custody — revoke anytime.
                </p>

                <ul className="mt-10 flex flex-col divide-y divide-white/10 border-y border-white/10">
                  {missing.map((m) => (
                    <li key={m.name} className="flex items-start gap-4 py-4">
                      <span className="text-white/25 text-lg leading-none mt-0.5">+</span>
                      <div>
                        <p className="text-white text-base md:text-lg">{m.name}</p>
                        <p className="text-white/45 text-sm mt-0.5">{m.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>

                {error && (
                  <p className="text-sm break-words mt-5" style={{ color: "#f87171" }}>
                    {error}
                  </p>
                )}

                <div className="mt-10 flex items-center gap-4">
                  <button
                    onClick={sync}
                    disabled={signing}
                    className="px-8 py-3.5 bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-40 btn-cut"
                  >
                    {signing ? "Confirm in wallet…" : "Sign & update"}
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    disabled={signing}
                    className="px-5 py-3.5 text-white/60 text-sm hover:text-white disabled:opacity-40"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
