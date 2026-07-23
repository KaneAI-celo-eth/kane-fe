import type { Address } from "viem";
import { useVaultBalance, useVaultPolicy } from "../hooks/useVault";

export function PolicyCard({ vault }: { vault: Address }) {
  const { data: policy, isLoading } = useVaultPolicy(vault);
  const { data: balance } = useVaultBalance(vault);

  if (isLoading || !policy) return <p className="muted">Loading policy…</p>;

  // [agent, budget, spent, perTxCap, windowCap, windowSpent, windowDuration, windowStart, expiry, version, revoked]
  const [agent, budget, spent, perTxCap, windowCap, , , , expiry, version, revoked] = policy;

  return (
    <dl className="grid">
      <Row k="Agent" v={agent} mono />
      <Row k="Version" v={String(version)} />
      <Row k="Revoked" v={revoked ? "yes" : "no"} />
      <Row k="Budget" v={budget.toString()} />
      <Row k="Spent" v={spent.toString()} />
      <Row k="Per-tx cap" v={perTxCap.toString()} />
      <Row k="Window cap" v={windowCap === 0n ? "off" : windowCap.toString()} />
      <Row k="Expiry" v={expiry === 0n ? "none" : new Date(Number(expiry) * 1000).toLocaleString()} />
      <Row k="Balance" v={balance !== undefined ? balance.toString() : "—"} />
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
