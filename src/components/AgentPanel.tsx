import { useEffect, useRef, useState } from "react";
import { useConnection } from "wagmi";
import { AGENT_API, proposeIntent, type IntentResult } from "../config/agent";

const PRESETS = [
  "I have 500 USDC sitting idle — put it to work earning yield.",
  "Move 200 USDC into Aave.",
  "Markets look risky — pull 100 USDC back to my wallet.",
];

function usdc(amount: string): string {
  return `${Number(amount) / 1e6} USDC`;
}

export function AgentPanel() {
  const { address } = useConnection();
  const [intent, setIntent] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IntentResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run(text: string) {
    const q = text.trim();
    if (!q) return;
    setLoading(true);
    setErr(null);
    setResult(null);
    try {
      setResult(await proposeIntent(q, address ?? undefined));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  // Optional demo/share deep-link: /app?intent=... runs once on load.
  const didAuto = useRef(false);
  useEffect(() => {
    if (didAuto.current) return;
    didAuto.current = true;
    const initial = new URLSearchParams(window.location.search).get("intent");
    if (initial) {
      setIntent(initial);
      void run(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <textarea
        rows={2}
        value={intent}
        onChange={(e) => setIntent(e.target.value)}
        placeholder="Tell the agent what to do — e.g. “put my idle USDC to work”"
        className="w-full bg-transparent border border-white/15 px-3 py-2.5 text-white text-sm placeholder:text-white/30 btn-cut-sm outline-none focus:border-white/40 resize-none"
      />

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => {
              setIntent(p);
              void run(p);
            }}
            className="text-xs text-white/55 border border-white/12 px-2.5 py-1.5 btn-cut-sm hover:text-white hover:border-white/30 transition-colors"
          >
            {p}
          </button>
        ))}
      </div>

      <div>
        <button
          onClick={() => run(intent)}
          disabled={loading || !intent.trim()}
          className="px-6 py-3 bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-40 btn-cut"
        >
          {loading ? "Thinking…" : "Ask the agent"}
        </button>
      </div>

      {err && (
        <div className="border border-white/12 btn-cut-sm p-4">
          <p className="text-sm" style={{ color: "#f87171" }}>
            Couldn't reach the agent.
          </p>
          <p className="text-white/50 text-sm mt-1 leading-relaxed">
            Start the runtime: <span className="font-mono text-white/70">bun run start</span> in{" "}
            <span className="font-mono text-white/70">kane-be</span> (needs{" "}
            <span className="font-mono text-white/70">AI_AUTH_TOKEN</span>). Trying{" "}
            <span className="font-mono text-white/70">{AGENT_API}</span> · {err}
          </p>
        </div>
      )}

      {result && <Proposal result={result} />}
    </div>
  );
}

function Proposal({ result }: { result: IntentResult }) {
  const a = result.action;

  if (a.kind === "noop") {
    return (
      <div className="border border-white/12 btn-cut-sm p-4">
        <p className="text-white/40 text-[11px] tracking-[0.18em] uppercase mb-1.5">The model advises</p>
        <p className="text-white/80 text-sm leading-relaxed">No safe action — {a.reason}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="border border-white/25 btn-cut-sm p-4 md:p-5">
        <p className="text-white/40 text-[11px] tracking-[0.18em] uppercase mb-2">The model advises</p>
        <p className="text-white text-xl md:text-2xl font-normal tracking-[-0.01em]">
          {a.kind === "supply" ? "Supply" : "Withdraw"} {usdc(a.amount)}{" "}
          <span className="text-white/45 text-base">→ Aave V3</span>
        </p>
        <p className="text-white/35 text-xs font-mono mt-2 break-all">
          {JSON.stringify({ kind: a.kind, amount: a.amount })} · no address — the runtime resolves it,
          bound to you
        </p>
      </div>

      <ChainVerdict result={result} />
    </div>
  );
}

// The demo policy the authorize-agent stepper provisions (mirrors kane-sc's fork test).
const DEMO_PER_TX_USDC = 1000;

function ChainVerdict({ result }: { result: IntentResult }) {
  // Real verdict: the on-chain gate dry-ran the pull (needs a deployed executor).
  if (result.dryRun) {
    const ok = result.dryRun.ok;
    return (
      <div className="border border-white/12 btn-cut-sm p-4">
        <p className="text-white/40 text-[11px] tracking-[0.18em] uppercase mb-1.5">The chain decides</p>
        {ok ? (
          <p className="text-white text-sm">Allowed ✓ — within your on-chain policy.</p>
        ) : (
          <p className="text-sm" style={{ color: "#f87171" }}>
            Blocked — {result.dryRun.reason ?? "outside your policy"}.
          </p>
        )}
      </div>
    );
  }

  // Pre-deploy: an honest client-side preview against the demo caps, clearly labelled.
  const a = result.action;
  const amt = a.kind === "noop" ? 0 : Number(a.amount) / 1e6;
  const within = amt <= DEMO_PER_TX_USDC;
  return (
    <div className="border border-white/12 btn-cut-sm p-4">
      <p className="text-white/40 text-[11px] tracking-[0.18em] uppercase mb-1.5">
        The chain decides <span className="text-white/25 normal-case tracking-normal">· preview</span>
      </p>
      {within ? (
        <p className="text-white text-sm">
          Within the demo policy ✓ — {amt} USDC ≤ {DEMO_PER_TX_USDC} USDC per-tx cap.
        </p>
      ) : (
        <p className="text-sm" style={{ color: "#f87171" }}>
          Exceeds the demo policy ✕ — {amt} USDC &gt; {DEMO_PER_TX_USDC} USDC per-tx cap → the gate
          would revert.
        </p>
      )}
      <p className="text-white/45 text-xs mt-2 leading-relaxed">
        Client-side preview against the demo caps. Authorize an agent to run the{" "}
        <span className="text-white/70">real on-chain gate</span> — the proposal is never executed
        until it approves.
      </p>
    </div>
  );
}
