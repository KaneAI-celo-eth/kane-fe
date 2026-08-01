import { useEffect } from "react";
import { useChainId, useConnection, useReadContract, useWriteContract } from "wagmi";
import type { Address, Hex } from "viem";
import { kaneExecutorFactoryAbi } from "../abi/kaneExecutorFactory";
import {
  aaveDataProviderAbi,
  AAVE_SUPPLY_SELECTOR,
  AAVE_WITHDRAW_SELECTOR,
} from "../abi/aave";
import { AAVE, EURM_CELO, UBESWAP, USDC_CELO, USDM_CELO, explorerFor } from "../config/contracts";
import { UBESWAP_SWAP_SELECTOR } from "../abi/ubeswap";
import { attributionSuffix } from "../config/attribution";
import { standardForbiddenSelectors } from "../config/forbiddenSelectors";
import { friendlyTxError } from "../config/errors";
import { useExecutor } from "../hooks/useExecutor";

// Demo caps: 1000 units per-tx / lifetime, window disabled (mirrors the kane-sc fork test).
const CAP_6 = 1_000_000_000n; // 1000e6 (USDC / aUSDC)
const CAP_18 = 1_000_000_000_000_000_000_000n; // 1000e18 (Mento stables)

/** The full owner policy applied atomically at creation (createExecutorWithPolicy): Aave V3
 *  supply/withdraw (USDC/aUSDC, recipient-bound word 2) + Ubeswap V2 swaps of the Mento stables
 *  (USDm/EURm, swap recipient-bound word 3). */
function buildPolicy(aavePool: Address, aUsdc: Address, ubeRouter: Address) {
  return {
    tokens: [
      { token: USDC_CELO, perTxCap: CAP_6, budget: CAP_6, windowCap: 0n, windowDuration: 0n },
      { token: aUsdc, perTxCap: CAP_6, budget: CAP_6, windowCap: 0n, windowDuration: 0n },
      { token: USDM_CELO, perTxCap: CAP_18, budget: CAP_18, windowCap: 0n, windowDuration: 0n },
      { token: EURM_CELO, perTxCap: CAP_18, budget: CAP_18, windowCap: 0n, windowDuration: 0n },
    ],
    targets: [aavePool, ubeRouter],
    selectors: [
      { target: aavePool, selector: AAVE_SUPPLY_SELECTOR, bindRecipient: true, recipientWordIndex: 2 },
      { target: aavePool, selector: AAVE_WITHDRAW_SELECTOR, bindRecipient: true, recipientWordIndex: 2 },
      // Ubeswap V2 swap: `to` is head word 3 → bind the swap output to the owner.
      { target: ubeRouter, selector: UBESWAP_SWAP_SELECTOR, bindRecipient: true, recipientWordIndex: 3 },
    ],
    forbiddenSelectors: standardForbiddenSelectors() as readonly Hex[],
  } as const;
}

/** The register CTA — one signature deploys the executor AND sets its policy. Deliberately minimal:
 *  the surrounding onboarding provides the words; this is just the button. */
export function AuthorizeAgent({ factory }: { factory: Address }) {
  const { address: owner } = useConnection();
  const chainId = useChainId();
  const aave = AAVE[chainId];

  const { refetch } = useExecutor(factory, owner);
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  // aUSDC (aToken) is resolved on-chain from Aave's ProtocolDataProvider — never hardcoded.
  const { data: reserveTokens } = useReadContract({
    address: aave?.dataProvider,
    abi: aaveDataProviderAbi,
    functionName: "getReserveTokensAddresses",
    args: [USDC_CELO],
    query: { enabled: Boolean(aave) },
  });
  const aUsdc = reserveTokens?.[0];

  useEffect(() => {
    if (hash) void refetch();
  }, [hash, refetch]);

  if (!aave) {
    return (
      <p className="text-white/50 text-sm text-center">
        Switch to <strong className="text-white">Celo Mainnet</strong> to authorize.
      </p>
    );
  }

  const ubeRouter = UBESWAP[chainId]?.router;

  function register() {
    if (!aUsdc || !ubeRouter) return;
    writeContract({
      address: factory,
      abi: kaneExecutorFactoryAbi,
      functionName: "createExecutorWithPolicy",
      args: [buildPolicy(aave!.pool, aUsdc, ubeRouter)],
      dataSuffix: attributionSuffix,
    });
  }

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <button
        className="w-full px-8 py-3.5 bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-40 btn-cut"
        disabled={isPending || !aUsdc || !ubeRouter}
        onClick={register}
      >
        {isPending ? "Confirm in wallet…" : !aUsdc ? "Preparing…" : "Authorize agent"}
      </button>
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
        <p className="text-xs text-center break-words max-w-xs" style={{ color: "#f87171" }}>
          {friendlyTxError(error)}
        </p>
      )}
    </div>
  );
}
