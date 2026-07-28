import { useEffect } from "react";
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
import { useExecutor } from "../hooks/useExecutor";

// Demo caps: 1000 USDC per-tx / lifetime, window disabled (mirrors the kane-sc fork test).
const PER_TX_CAP = 1_000_000_000n; // 1000e6
const BUDGET = 1_000_000_000n; // 1000e6

/** The full owner policy applied atomically at creation (createExecutorWithPolicy). */
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

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <button
        className="w-full px-8 py-3.5 bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-40 btn-cut"
        disabled={isPending || !aUsdc}
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
          {error.message}
        </p>
      )}
    </div>
  );
}
