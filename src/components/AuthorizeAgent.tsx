import { useEffect } from "react";
import { useChainId, useConnection, useReadContract, useWriteContract } from "wagmi";
import type { Address, Hex } from "viem";
import { kaneExecutorFactoryAbi } from "../abi/kaneExecutorFactory";
import {
  aaveDataProviderAbi,
  AAVE_SUPPLY_SELECTOR,
  AAVE_WITHDRAW_SELECTOR,
} from "../abi/aave";
import {
  AAVE,
  EURM_CELO,
  MENTO,
  MENTO_STABLES,
  MENTO_SWAP_SELECTOR,
  MOOLA,
  MOOLA_DEPOSIT_SELECTOR,
  MOOLA_TOKENS,
  MOOLA_WITHDRAW_SELECTOR,
  UBESWAP,
  UNISWAP_SWAP_SELECTOR,
  UNISWAP_V3,
  USDC_CELO,
  USDM_CELO,
  explorerFor,
} from "../config/contracts";
import { UBESWAP_SWAP_SELECTOR } from "../abi/ubeswap";
import { attributionSuffix } from "../config/attribution";
import { standardForbiddenSelectors } from "../config/forbiddenSelectors";
import { friendlyTxError } from "../config/errors";
import { useExecutor } from "../hooks/useExecutor";

// Demo caps: 1000 units per-tx / lifetime, window disabled (mirrors the kane-sc fork test).
const CAP_6 = 1_000_000_000n; // 1000e6 (USDC / aUSDC)
const CAP_18 = 1_000_000_000_000_000_000_000n; // 1000e18 (Mento stables)

/** The full owner policy applied atomically at creation (createExecutorWithPolicy): Aave V3
 *  supply/withdraw (USDC/aUSDC, recipient-bound word 2) + swaps on BOTH Ubeswap V2 and Mento V3
 *  (recipient-bound word 3 on each). The Mento local-currency stables are provisioned as pull
 *  tokens so the agent can swap FROM them (subject to Mento FX-hours / oracle breakers).
 *
 *  ⚠️ KEEP IN SYNC WITH `UpdatePolicy.canonicalVenues` (the existing-executor sync). A new swap
 *  venue must be added HERE (so new executors get it at registration) AND there (so existing
 *  executors are prompted to add it via the console's owner-signed Update-policy button). */
function buildPolicy(
  aavePool: Address,
  aUsdc: Address,
  ubeRouter: Address,
  mentoRouter: Address,
  uniswapRouter: Address,
  moolaPool: Address,
) {
  const cap18 = (token: Address) => ({ token, perTxCap: CAP_18, budget: CAP_18, windowCap: 0n, windowDuration: 0n });
  const mentoTokens = Object.values(MENTO_STABLES).map(cap18);
  const moolaTokens = MOOLA_TOKENS.map(cap18); // CELO + mTokens (18d)
  return {
    tokens: [
      { token: USDC_CELO, perTxCap: CAP_6, budget: CAP_6, windowCap: 0n, windowDuration: 0n },
      { token: aUsdc, perTxCap: CAP_6, budget: CAP_6, windowCap: 0n, windowDuration: 0n },
      { token: USDM_CELO, perTxCap: CAP_18, budget: CAP_18, windowCap: 0n, windowDuration: 0n },
      { token: EURM_CELO, perTxCap: CAP_18, budget: CAP_18, windowCap: 0n, windowDuration: 0n },
      ...mentoTokens,
      ...moolaTokens,
    ],
    targets: [aavePool, ubeRouter, mentoRouter, uniswapRouter, moolaPool],
    selectors: [
      { target: aavePool, selector: AAVE_SUPPLY_SELECTOR, bindRecipient: true, recipientWordIndex: 2 },
      { target: aavePool, selector: AAVE_WITHDRAW_SELECTOR, bindRecipient: true, recipientWordIndex: 2 },
      // Ubeswap V2 swap: `to` is head word 3 → bind the swap output to the owner.
      { target: ubeRouter, selector: UBESWAP_SWAP_SELECTOR, bindRecipient: true, recipientWordIndex: 3 },
      // Mento V3 swap: recipient is head word 3 too → bind the swap output to the owner.
      { target: mentoRouter, selector: MENTO_SWAP_SELECTOR, bindRecipient: true, recipientWordIndex: 3 },
      // Uniswap V3 exactInputSingle: recipient is head word 3 (all-static struct) → bind to owner.
      { target: uniswapRouter, selector: UNISWAP_SWAP_SELECTOR, bindRecipient: true, recipientWordIndex: 3 },
      // Moola Market (Aave V2 fork): deposit/withdraw bind the recipient at head word 2.
      { target: moolaPool, selector: MOOLA_DEPOSIT_SELECTOR, bindRecipient: true, recipientWordIndex: 2 },
      { target: moolaPool, selector: MOOLA_WITHDRAW_SELECTOR, bindRecipient: true, recipientWordIndex: 2 },
    ],
    forbiddenSelectors: standardForbiddenSelectors() as readonly Hex[],
  };
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
  const mentoRouter = MENTO[chainId]?.router;
  const uniswapRouter = UNISWAP_V3[chainId]?.router;
  const moolaPool = MOOLA[chainId]?.pool;

  function register() {
    if (!aUsdc || !ubeRouter || !mentoRouter || !uniswapRouter || !moolaPool) return;
    writeContract({
      address: factory,
      abi: kaneExecutorFactoryAbi,
      functionName: "createExecutorWithPolicy",
      args: [buildPolicy(aave!.pool, aUsdc, ubeRouter, mentoRouter, uniswapRouter, moolaPool)],
      dataSuffix: attributionSuffix,
    });
  }

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <button
        className="w-full px-8 py-3.5 bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-40 btn-cut"
        disabled={isPending || !aUsdc || !ubeRouter || !mentoRouter || !uniswapRouter || !moolaPool}
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
