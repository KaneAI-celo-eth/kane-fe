import { useEffect, useState } from "react";
import { useChainId, useConnection, useReadContract, useWriteContract } from "wagmi";
import { isAddress, type Address } from "viem";
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
];
const DONE = STEP_LABELS.length;

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
      <p className="muted">
        The demo action is an Aave V3 rebalance — only on <strong>Celo Mainnet</strong>. Switch
        network to authorize an agent.
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
        : step === 3
          ? Boolean(executor && aUsdc)
          : Boolean(executor));

  return (
    <div className="stack">
      <ol className="steps">
        {STEP_LABELS.map((label, i) => (
          <li key={label} className={i < step ? "done" : i === step ? "active" : "todo"}>
            <span className="tick">{i < step ? "✓" : i + 1}</span>
            {label}
          </li>
        ))}
      </ol>

      {executor && (
        <p className="ok small">
          Executor:{" "}
          <a
            href={`${explorerFor(chainId)}/address/${executor}`}
            target="_blank"
            rel="noreferrer"
            className="mono"
          >
            {executor}
          </a>
        </p>
      )}

      {step === 1 && (
        <label className="field">
          <span>Agent address (the delegated key kane-be signs with)</span>
          <input
            className="input mono"
            placeholder="0x…"
            value={agentAddr}
            onChange={(e) => setAgentAddr(e.target.value.trim())}
          />
          {agentAddr && !agentValid && <span className="err small">Not a valid address.</span>}
        </label>
      )}

      {step === 3 && !aUsdc && (
        <p className="muted small">Resolving aUSDC from Aave's data provider…</p>
      )}

      {step < DONE ? (
        <div className="row">
          <button className="btn" disabled={!canRun} onClick={runStep}>
            {currentPending ? "Confirm in wallet…" : `Step ${step + 1}: ${STEP_LABELS[step]}`}
          </button>
          {currentHash && (
            <button className="btn ghost" onClick={next}>
              Next ▸
            </button>
          )}
        </div>
      ) : (
        <p className="ok">Agent authorized ✓ — kane-be can now drive the executor.</p>
      )}

      {currentHash && (
        <p className="small muted">
          tx:{" "}
          <a
            href={`${explorerFor(chainId)}/tx/${currentHash}`}
            target="_blank"
            rel="noreferrer"
            className="mono"
          >
            {currentHash.slice(0, 10)}…
          </a>
        </p>
      )}
      {currentError && <p className="err">{currentError.message}</p>}
    </div>
  );
}
