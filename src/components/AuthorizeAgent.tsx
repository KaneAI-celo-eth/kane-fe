import { useEffect, useState } from "react";
import { useChainId, useConnection, useReadContract, useWriteContract } from "wagmi";
import { erc20Abi, isAddress, maxUint256, type Address } from "viem";
import { kaneExecutorAbi } from "../abi/kaneExecutor";
import {
  aaveDataProviderAbi,
  AAVE_SUPPLY_SELECTOR,
  AAVE_WITHDRAW_SELECTOR,
} from "../abi/aave";
import { AAVE, USDC_CELO, explorerFor } from "../config/contracts";
import { attributionSuffix } from "../config/attribution";
import { standardForbiddenSelectors } from "../config/forbiddenSelectors";
import { useCreateExecutor } from "../hooks/useCreateExecutor";
import { useExecutor } from "../hooks/useExecutor";

// Demo caps: 1000 USDC per-tx / lifetime, window disabled (mirrors the kane-sc fork test).
const PER_TX_CAP = 1_000_000_000n; // 1000e6
const BUDGET = 1_000_000_000n; // 1000e6
const WINDOW_CAP = 0n;
const WINDOW_DURATION = 0n;

const STEP_LABELS = [
  "Create executor",
  "Set agent key",
  "Provision USDC caps",
  "Provision aUSDC caps",
  "Allowlist Aave pool",
  "Allow supply (recipient-bound)",
  "Allow withdraw (recipient-bound)",
  "Seed forbidden selectors",
  "Approve USDC to executor",
  "Approve aUSDC to executor",
];
const DONE = STEP_LABELS.length;

// One plain-language line per step — what you're actually signing and why it's safe.
const STEP_HELP = [
  "Deploys your own KaneExecutor — a single-owner contract that only ever holds your allowances.",
  "Names the delegated key the agent signs with. It can propose moves, but only within the limits below.",
  "Sets how much USDC the agent may move: per-transaction cap, total budget, and an optional time window.",
  "Same caps for the Aave interest token (aUSDC), so withdrawals stay bounded too.",
  "Whitelists the Aave V3 pool as the one venue the agent may call. Everything else stays blocked.",
  "Permits supply — with the deposit hard-bound to your address, so yield accrues to you, never the agent.",
  "Permits withdraw — with the payout hard-bound to your address. The agent can't redirect funds out.",
  "Blocks raw transfer / approve / permit selectors, so an allowlisted call can never smuggle a token move.",
  "Grants the executor an allowance to pull USDC on your behalf. It pulls only within the caps above.",
  "Grants the same allowance for aUSDC, so the agent can unwind an Aave position back to you.",
];

export function AuthorizeAgent({ factory }: { factory: Address }) {
  const { address: owner } = useConnection();
  const chainId = useChainId();
  const aave = AAVE[chainId];

  const { executor, refetch } = useExecutor(factory, owner);
  const create = useCreateExecutor();
  const { mutate: writeExecutor, data: execHash, isPending: execPending, error: execError, reset } =
    useWriteContract();

  const [step, setStep] = useState(0);
  const [agentAddr, setAgentAddr] = useState("");

  // aUSDC (aToken) is resolved on-chain from Aave's ProtocolDataProvider — never hardcoded.
  const { data: reserveTokens } = useReadContract({
    address: aave?.dataProvider,
    abi: aaveDataProviderAbi,
    functionName: "getReserveTokensAddresses",
    args: [USDC_CELO],
    query: { enabled: Boolean(aave) },
  });
  const aUsdc = reserveTokens?.[0];

  // Re-resolve the executor after the create tx, and auto-advance past step 0 once it exists.
  useEffect(() => {
    if (create.hash) void refetch();
  }, [create.hash, refetch]);
  useEffect(() => {
    if (executor && step === 0) setStep(1);
  }, [executor, step]);

  if (!aave) {
    return (
      <p className="text-white/55 text-sm leading-relaxed">
        The demo action is an Aave V3 rebalance — only on <strong className="text-white">Celo
        Mainnet</strong>. Switch network to authorize an agent.
      </p>
    );
  }

  const aavePool = aave.pool;
  const agentValid = isAddress(agentAddr);
  const isCreateStep = step === 0;
  const currentHash = isCreateStep ? create.hash : execHash;
  const currentPending = isCreateStep ? create.isPending : execPending;
  const currentError = isCreateStep ? create.error : execError;

  function runStep() {
    switch (step) {
      case 0:
        create.createExecutor(factory);
        return;
      case 1:
        if (!executor || !agentValid) return;
        writeExecutor({
          address: executor,
          abi: kaneExecutorAbi,
          functionName: "setAgent",
          args: [agentAddr as Address],
          dataSuffix: attributionSuffix,
        });
        return;
      case 2:
        if (!executor) return;
        writeExecutor({
          address: executor,
          abi: kaneExecutorAbi,
          functionName: "provisionToken",
          args: [USDC_CELO, PER_TX_CAP, BUDGET, WINDOW_CAP, WINDOW_DURATION],
          dataSuffix: attributionSuffix,
        });
        return;
      case 3:
        if (!executor || !aUsdc) return;
        writeExecutor({
          address: executor,
          abi: kaneExecutorAbi,
          functionName: "provisionToken",
          args: [aUsdc, PER_TX_CAP, BUDGET, WINDOW_CAP, WINDOW_DURATION],
          dataSuffix: attributionSuffix,
        });
        return;
      case 4:
        if (!executor) return;
        writeExecutor({
          address: executor,
          abi: kaneExecutorAbi,
          functionName: "setAllowedTarget",
          args: [aavePool, true],
          dataSuffix: attributionSuffix,
        });
        return;
      case 5:
        if (!executor) return;
        // bindRecipient=true, recipientWordIndex=2 → Aave supply.onBehalfOf is forced to the owner.
        writeExecutor({
          address: executor,
          abi: kaneExecutorAbi,
          functionName: "setAllowedSelector",
          args: [aavePool, AAVE_SUPPLY_SELECTOR, true, true, 2],
          dataSuffix: attributionSuffix,
        });
        return;
      case 6:
        if (!executor) return;
        // bindRecipient=true, recipientWordIndex=2 → Aave withdraw.to is forced to the owner.
        writeExecutor({
          address: executor,
          abi: kaneExecutorAbi,
          functionName: "setAllowedSelector",
          args: [aavePool, AAVE_WITHDRAW_SELECTOR, true, true, 2],
          dataSuffix: attributionSuffix,
        });
        return;
      case 7:
        if (!executor) return;
        writeExecutor({
          address: executor,
          abi: kaneExecutorAbi,
          functionName: "setForbiddenSelectors",
          args: [standardForbiddenSelectors(), true],
          dataSuffix: attributionSuffix,
        });
        return;
      case 8:
        // The executor pulls via transferFrom(owner) — the owner must approve it first.
        if (!executor) return;
        writeExecutor({
          address: USDC_CELO,
          abi: erc20Abi,
          functionName: "approve",
          args: [executor, maxUint256],
          dataSuffix: attributionSuffix,
        });
        return;
      case 9:
        if (!executor || !aUsdc) return;
        writeExecutor({
          address: aUsdc,
          abi: erc20Abi,
          functionName: "approve",
          args: [executor, maxUint256],
          dataSuffix: attributionSuffix,
        });
        return;
    }
  }

  function next() {
    reset();
    setStep((s) => Math.min(s + 1, DONE));
  }

  // Each step needs its precondition met before the owner can sign it.
  const canRun =
    !currentPending &&
    (step === 0
      ? true
      : step === 1
        ? Boolean(executor && agentValid)
        : step === 3 || step === 9
          ? Boolean(executor && aUsdc)
          : Boolean(executor));

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-1.5 m-0 p-0 list-none">
        {STEP_LABELS.map((label, i) => {
          const state = i < step ? "done" : i === step ? "active" : "todo";
          return (
            <li
              key={label}
              className={`flex items-center gap-2.5 text-sm ${
                state === "done"
                  ? "text-white"
                  : state === "active"
                    ? "text-white font-medium"
                    : "text-white/35"
              }`}
            >
              <span
                className={`w-6 h-6 flex items-center justify-center text-xs btn-cut-sm flex-none ${
                  state === "done"
                    ? "bg-white text-black"
                    : state === "active"
                      ? "border border-white text-white"
                      : "border border-white/25 text-white/40"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </span>
              {label}
            </li>
          );
        })}
      </ol>

      {executor && (
        <p className="text-white text-sm">
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
      )}

      {step < DONE && <p className="text-white/55 text-sm leading-relaxed">{STEP_HELP[step]}</p>}

      {step === 1 && (
        <label className="flex flex-col gap-1.5">
          <span className="text-white/55 text-sm">
            Agent address — the delegated key KaneAI signs with (never your own wallet)
          </span>
          <input
            className="w-full bg-transparent border border-white/15 px-3 py-2.5 text-white text-sm placeholder:text-white/30 font-mono btn-cut-sm outline-none focus:border-white/40"
            placeholder="0x…"
            value={agentAddr}
            onChange={(e) => setAgentAddr(e.target.value.trim())}
          />
          {agentAddr && !agentValid && (
            <span className="text-sm" style={{ color: "#f87171" }}>
              Not a valid address.
            </span>
          )}
        </label>
      )}

      {(step === 3 || step === 9) && !aUsdc && (
        <p className="text-white/45 text-sm">Resolving aUSDC from Aave's data provider…</p>
      )}

      {step < DONE ? (
        <div className="flex items-center gap-3 flex-wrap">
          <button
            className="px-6 py-3 bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-40 btn-cut"
            disabled={!canRun}
            onClick={runStep}
          >
            {currentPending ? "Confirm in wallet…" : `Step ${step + 1}: ${STEP_LABELS[step]}`}
          </button>
          {currentHash && (
            <button
              className="px-5 py-2.5 text-white text-sm hover:bg-white/10 btn-cut-border"
              onClick={next}
            >
              Next ▸
            </button>
          )}
        </div>
      ) : (
        <p className="text-white text-sm leading-relaxed">
          Agent authorized ✓ — KaneAI can now rebalance within your policy. Funds stay yours; revoke
          anytime from the Policy card.
        </p>
      )}

      {currentHash && (
        <p className="text-white/50 text-sm">
          tx:{" "}
          <a
            href={`${explorerFor(chainId)}/tx/${currentHash}`}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-white/70 underline underline-offset-4 hover:text-white"
          >
            {currentHash.slice(0, 10)}…
          </a>
        </p>
      )}
      {currentError && (
        <p className="text-sm break-words" style={{ color: "#f87171" }}>
          {currentError.message}
        </p>
      )}
    </div>
  );
}
