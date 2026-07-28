import { useEffect, useState } from "react";
import { useChainId, useConnection, useReadContract, useWriteContract } from "wagmi";
import type { Address, Hex } from "viem";
import { kaneExecutorFactoryAbi } from "../abi/kaneExecutorFactory";
import {
  aaveDataProviderAbi,
  AAVE_SUPPLY_SELECTOR,
  AAVE_WITHDRAW_SELECTOR,
} from "../abi/aave";
import { AAVE, USDC_CELO, explorerFor } from "../config/contracts";
import { attributionSuffix } from "../config/attribution";
import { standardForbiddenSelectors } from "../config/forbiddenSelectors";
import { fetchAgentAddress } from "../config/agent";
import { useExecutor } from "../hooks/useExecutor";

// Demo caps: 1000 USDC per-tx / lifetime, window disabled (mirrors the kane-sc fork test).
const PER_TX_CAP = 1_000_000_000n; // 1000e6
const BUDGET = 1_000_000_000n; // 1000e6

/** The full owner policy, applied atomically at creation (createExecutorWithPolicy): USDC + aUSDC
 *  caps, the Aave V3 pool as the only venue, supply/withdraw permitted with the payout hard-bound
 *  to the owner (word 2), and the standard raw-token-move denylist. */
function buildPolicy(aavePool: Address, aUsdc: Address) {
  return {
    tokens: [
      { token: USDC_CELO, perTxCap: PER_TX_CAP, budget: BUDGET, windowCap: 0n, windowDuration: 0n },
      { token: aUsdc, perTxCap: PER_TX_CAP, budget: BUDGET, windowCap: 0n, windowDuration: 0n },
    ],
    targets: [aavePool],
    selectors: [
      { target: aavePool, selector: AAVE_SUPPLY_SELECTOR, bindRecipient: true, recipientWordIndex: 2 },
      { target: aavePool, selector: AAVE_WITHDRAW_SELECTOR, bindRecipient: true, recipientWordIndex: 2 },
    ],
    forbiddenSelectors: standardForbiddenSelectors() as readonly Hex[],
  } as const;
}

export function AuthorizeAgent({ factory }: { factory: Address }) {
  const { address: owner } = useConnection();
  const chainId = useChainId();
  const aave = AAVE[chainId];

  const { executor, refetch } = useExecutor(factory, owner);
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  // KaneAI provides the agent centrally (set on the factory) — we only fetch it to SHOW it.
  const [kaneAgent, setKaneAgent] = useState<Address | null>(null);
  useEffect(() => {
    let live = true;
    void fetchAgentAddress().then((a) => {
      if (live && a) setKaneAgent(a);
    });
    return () => {
      live = false;
    };
  }, []);

  // aUSDC (aToken) is resolved on-chain from Aave's ProtocolDataProvider — never hardcoded.
  const { data: reserveTokens } = useReadContract({
    address: aave?.dataProvider,
    abi: aaveDataProviderAbi,
    functionName: "getReserveTokensAddresses",
    args: [USDC_CELO],
    query: { enabled: Boolean(aave) },
  });
  const aUsdc = reserveTokens?.[0];

  // re-resolve the executor once the register tx lands
  useEffect(() => {
    if (hash) void refetch();
  }, [hash, refetch]);

  if (!aave) {
    return (
      <p className="text-white/55 text-sm leading-relaxed">
        The demo action is an Aave V3 rebalance — only on <strong className="text-white">Celo
        Mainnet</strong>. Switch network to authorize an agent.
      </p>
    );
  }

  function register() {
    if (!aUsdc) return;
    writeContract({
      address: factory,
      abi: kaneExecutorFactoryAbi,
      functionName: "createExecutorWithPolicy",
      args: [buildPolicy(aave!.pool, aUsdc)],
      dataSuffix: attributionSuffix,
    });
  }

  // Already registered → show the configured state.
  if (executor) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-white text-sm leading-relaxed">
          Registered ✓ — your executor is live and fully configured. The agent works only within
          your policy; funds stay yours (allowances are granted just-in-time when you first move
          funds), and you can revoke anytime from the Policy card.
        </p>
        <p className="text-white/60 text-sm">
          Executor:{" "}
          <a
            href={`${explorerFor(chainId)}/address/${executor}`}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-white/70 underline underline-offset-4 hover:text-white break-all"
          >
            {executor}
          </a>
        </p>
        {kaneAgent && (
          <p className="text-white/45 text-xs">
            Delegates to KaneAI's central agent{" "}
            <span className="font-mono text-white/60 break-all">{kaneAgent}</span>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-white/55 text-sm leading-relaxed">
        <strong className="text-white">One transaction</strong> deploys your personal executor and
        sets your entire policy: USDC + aUSDC spending caps, the Aave V3 pool as the only venue,
        supply/withdraw with the payout hard-bound to your address, and a raw-token-move denylist.
        Nothing here grants custody — revoke anytime.
      </p>

      {kaneAgent && (
        <div className="flex flex-col gap-1.5">
          <span className="text-white/55 text-sm">
            Delegates to <strong className="text-white">KaneAI's agent</strong> — set centrally on
            the factory and read live by every executor, so you never manage a key.
          </span>
          <div className="border border-white/15 px-3 py-2.5 btn-cut-sm">
            <span className="font-mono text-white text-sm break-all">{kaneAgent}</span>
          </div>
        </div>
      )}

      {!aUsdc && <p className="text-white/45 text-sm">Resolving aUSDC from Aave's data provider…</p>}

      <button
        className="self-start px-6 py-3 bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-40 btn-cut"
        disabled={isPending || !aUsdc}
        onClick={register}
      >
        {isPending ? "Confirm in wallet…" : "Register — 1 signature"}
      </button>

      {hash && (
        <p className="text-white/50 text-sm">
          tx:{" "}
          <a
            href={`${explorerFor(chainId)}/tx/${hash}`}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-white/70 underline underline-offset-4 hover:text-white"
          >
            {hash.slice(0, 10)}…
          </a>
        </p>
      )}
      {error && (
        <p className="text-sm break-words" style={{ color: "#f87171" }}>
          {error.message}
        </p>
      )}
    </div>
  );
}
