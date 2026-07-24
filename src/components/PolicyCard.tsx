import type { Address } from "viem";
import { useReadContract } from "wagmi";
import { kaneExecutorAbi } from "../abi/kaneExecutor";
import { USDC_CELO } from "../config/contracts";
import { MANAGER_ROLE, useTokenPolicy } from "../hooks/useExecutor";

const ZERO = "0x0000000000000000000000000000000000000000";

/** 6-decimal USDC base units → human string. */
function usdc(v: bigint): string {
  return `${Number(v) / 1e6} USDC`;
}

export function PolicyCard({ executor, owner }: { executor: Address; owner: Address }) {
  const { data: policy, isLoading } = useTokenPolicy(executor, USDC_CELO);
  const { data: agent } = useReadContract({
    address: executor,
    abi: kaneExecutorAbi,
    functionName: "agent",
  });
  const { data: version } = useReadContract({
    address: executor,
    abi: kaneExecutorAbi,
    functionName: "version",
  });
  const { data: revoked } = useReadContract({
    address: executor,
    abi: kaneExecutorAbi,
    functionName: "revoked",
  });
  const { data: isManager } = useReadContract({
    address: executor,
    abi: kaneExecutorAbi,
    functionName: "hasRole",
    args: [MANAGER_ROLE, owner],
  });

  if (isLoading || !policy) return <p className="muted">Loading policy…</p>;

  const agentSet = Boolean(agent && agent !== ZERO);

  return (
    <dl className="grid">
      <Row k="Owner (MANAGER)" v={isManager ? "yes" : "no"} />
      <Row k="Agent" v={agentSet ? (agent as string) : "not set"} mono={agentSet} />
      <Row k="Version" v={version !== undefined ? String(version) : "—"} />
      <Row k="Revoked" v={revoked ? "yes" : "no"} />
      <Row k="USDC per-tx cap" v={usdc(policy.perTxCap)} />
      <Row k="USDC budget" v={usdc(policy.budget)} />
      <Row k="USDC spent" v={usdc(policy.spent)} />
      <Row k="USDC window cap" v={policy.windowCap === 0n ? "off" : usdc(policy.windowCap)} />
    </dl>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <>
      <dt>{k}</dt>
      <dd className={mono ? "mono" : undefined}>{v}</dd>
    </>
  );
}
