import { useEffect, useState } from "react";
import { useChainId, useConnection, useReadContract, useWriteContract } from "wagmi";
import { encodeFunctionData, isAddress, type Address, type Hex } from "viem";
import { kaneExecutorAbi } from "../abi/kaneExecutor";
import {
  aaveDataProviderAbi,
  AAVE_SUPPLY_SELECTOR,
  AAVE_WITHDRAW_SELECTOR,
} from "../abi/aave";
import { AAVE, USDC_CELO, explorerFor } from "../config/contracts";
import { attributionSuffix } from "../config/attribution";
import { standardForbiddenSelectors } from "../config/forbiddenSelectors";
import { fetchAgentAddress } from "../config/agent";
import { useCreateExecutor } from "../hooks/useCreateExecutor";
import { useExecutor } from "../hooks/useExecutor";

// Demo caps: 1000 USDC per-tx / lifetime, window disabled (mirrors the kane-sc fork test).
const PER_TX_CAP = 1_000_000_000n; // 1000e6
const BUDGET = 1_000_000_000n; // 1000e6
const WINDOW_CAP = 0n;
const WINDOW_DURATION = 0n;

// Registration is just create + one policy tx. The ERC-20 allowance the executor needs to pull
// funds is granted just-in-time — at the moment a fund-moving action is actually signed — not here.
const STEP_LABELS = ["Create executor", "Authorize agent — 1 signature"];
const DONE = STEP_LABELS.length;

const STEP_HELP = [
  "Deploys your own KaneExecutor — a single-owner contract that only ever holds your allowances.",
  "ONE transaction sets the entire policy (batched via the executor's Multicall): names KaneAI's agent, sets USDC + aUSDC caps, allowlists the Aave V3 pool, permits supply & withdraw with the payout hard-bound to your address, and blocks raw token-move selectors. (Token allowances are granted later, when you first move funds.)",
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
  // KaneAI provides the agent: fetch our dedicated signer from the backend and pre-fill it,
  // so the user authorizes it in one click instead of pasting an address they can't know.
  const [kaneAgent, setKaneAgent] = useState<Address | null>(null);
  const [override, setOverride] = useState(false);

  useEffect(() => {
    let live = true;
    void fetchAgentAddress().then((a) => {
      if (live && a) {
        setKaneAgent(a);
        setAgentAddr((cur) => cur || a);
      }
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

  /** Step 2 — the entire policy in a single tx via the executor's Multicall. */
  function authorizeMulticall() {
    if (!executor || !agentValid || !aUsdc) return;
    const calls: Hex[] = [
      encodeFunctionData({ abi: kaneExecutorAbi, functionName: "setAgent", args: [agentAddr as Address] }),
      encodeFunctionData({
        abi: kaneExecutorAbi,
        functionName: "provisionToken",
        args: [USDC_CELO, PER_TX_CAP, BUDGET, WINDOW_CAP, WINDOW_DURATION],
      }),
      encodeFunctionData({
        abi: kaneExecutorAbi,
        functionName: "provisionToken",
        args: [aUsdc, PER_TX_CAP, BUDGET, WINDOW_CAP, WINDOW_DURATION],
      }),
      encodeFunctionData({ abi: kaneExecutorAbi, functionName: "setAllowedTarget", args: [aavePool, true] }),
      // bindRecipient=true, recipientWordIndex=2 → Aave supply.onBehalfOf forced to the owner.
      encodeFunctionData({
        abi: kaneExecutorAbi,
        functionName: "setAllowedSelector",
        args: [aavePool, AAVE_SUPPLY_SELECTOR, true, true, 2],
      }),
      // bindRecipient=true, recipientWordIndex=2 → Aave withdraw.to forced to the owner.
      encodeFunctionData({
        abi: kaneExecutorAbi,
        functionName: "setAllowedSelector",
        args: [aavePool, AAVE_WITHDRAW_SELECTOR, true, true, 2],
      }),
      encodeFunctionData({
        abi: kaneExecutorAbi,
        functionName: "setForbiddenSelectors",
        args: [standardForbiddenSelectors(), true],
      }),
    ];
    writeExecutor({
      address: executor,
      abi: kaneExecutorAbi,
      functionName: "multicall",
      args: [calls],
      dataSuffix: attributionSuffix,
    });
  }

  function runStep() {
    switch (step) {
      case 0:
        create.createExecutor(factory);
        return;
      case 1:
        authorizeMulticall();
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
    (step === 0 ? true : Boolean(executor && agentValid && aUsdc));

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

      {step === 1 &&
        (kaneAgent && !override ? (
          <div className="flex flex-col gap-2">
            <span className="text-white/55 text-sm">
              Signing this authorizes <strong className="text-white">KaneAI's agent</strong> — the
              dedicated key our runtime signs with. A bounded mandate, never custody.
            </span>
            <div className="border border-white/15 px-3 py-2.5 btn-cut-sm">
              <span className="font-mono text-white text-sm break-all">{kaneAgent}</span>
            </div>
            <button
              type="button"
              onClick={() => setOverride(true)}
              className="self-start text-white/40 text-xs hover:text-white/70 transition-colors"
            >
              Advanced: use a different agent address
            </button>
          </div>
        ) : (
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
            {kaneAgent && (
              <button
                type="button"
                onClick={() => {
                  setOverride(false);
                  setAgentAddr(kaneAgent);
                }}
                className="self-start text-white/40 text-xs hover:text-white/70 transition-colors"
              >
                Use KaneAI's agent instead
              </button>
            )}
          </label>
        ))}

      {step === 1 && !aUsdc && (
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
          Agent authorized ✓ — KaneAI can now propose moves within your policy. Funds stay yours; the
          allowance to pull a token is granted the first time you move it, and you can revoke anytime
          from the Policy card.
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
