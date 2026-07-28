import { useEffect, useRef, useState, type ReactNode } from "react";
import { useConnection } from "wagmi";
import type { Address } from "viem";
import { AGENT_API, proposeIntent, type ChatTurn, type IntentResult } from "../config/agent";
import { useChatSessions } from "../hooks/useChatSessions";
import { ExecuteButton } from "./ExecuteButton";

const PRESETS = [
  "I have 500 USDC sitting idle — put it to work earning yield.",
  "Swap 100 USDm to EURm.",
  "What's the best USDC yield on Celo right now?",
  "What project ideas fit Proof of Ship?",
];

function usdc(amount: string): string {
  return `${Number(amount) / 1e6} USDC`;
}

/** Short natural-language recap of an agent turn — the assistant side of the chat history. */
function summarize(r: IntentResult): string {
  const a = r.action;
  if (a.kind === "answer") return a.text;
  if (a.kind === "swap")
    return r.quote
      ? `Proposed swap ${a.amount} ${r.quote.from} → ~${r.quote.amountOutHuman} ${r.quote.to} on Ubeswap V2.`
      : `Swap ${a.amount} ${a.from}→${a.to} not routable: ${r.error ?? "thin pool"}.`;
  if (a.kind === "supply" || a.kind === "withdraw") return `Proposed ${a.kind} ${usdc(a.amount)} on Aave V3.`;
  return `No action: ${a.reason}`;
}

export function AgentPanel({ executor }: { executor?: Address }) {
  const { address } = useConnection();
  const chat = useChatSessions();
  const { active, sessions, activeId, newSession, ensureSession, selectSession, deleteSession, updateMessages, getMessages } = chat;

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = active?.messages ?? [];
  const empty = messages.length === 0;

  async function run(text: string, forcedSid?: string) {
    const q = text.trim();
    if (!q || loading) return;
    setErr(null);
    setInput("");
    const sid = forcedSid ?? ensureSession();
    // history = prior turns in THIS session (before appending the new one)
    const history: ChatTurn[] = getMessages(sid).map((m) =>
      m.role === "user"
        ? { role: "user", content: m.text }
        : { role: "assistant", content: summarize(m.result) },
    );
    updateMessages(sid, (prev) => [...prev, { role: "user", text: q }]);
    setLoading(true);
    try {
      const result = await proposeIntent(q, address ?? undefined, history);
      updateMessages(sid, (prev) => [...prev, { role: "agent", result }]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  // keep the conversation scrolled to the latest turn
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Optional demo/share deep-link: /app?intent=… opens a fresh session and runs once,
  // then strips the param so a manual refresh doesn't duplicate the chat.
  const didAuto = useRef(false);
  useEffect(() => {
    if (didAuto.current) return;
    didAuto.current = true;
    const initial = new URLSearchParams(window.location.search).get("intent");
    if (initial) {
      const sid = newSession();
      window.history.replaceState(null, "", window.location.pathname);
      void run(initial, sid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-5">
      {/* Sessions sidebar — always shown on md+, toggled on mobile */}
      <aside
        className={`${sidebarOpen ? "flex" : "hidden"} md:flex flex-col gap-1 md:w-44 shrink-0 md:border-r md:border-white/10 md:pr-3`}
      >
        <button
          onClick={() => {
            newSession();
            setSidebarOpen(false);
          }}
          className="text-left text-xs text-white/70 border border-white/15 px-2.5 py-2 btn-cut-sm hover:text-white hover:border-white/30 transition-colors mb-1"
        >
          + New chat
        </button>
        {sessions.length === 0 && (
          <p className="text-white/25 text-[11px] px-1 py-1">No past chats yet.</p>
        )}
        {sessions.map((s) => (
          <div
            key={s.id}
            className={`group flex items-center gap-1 btn-cut-sm px-2.5 py-1.5 cursor-pointer transition-colors ${
              s.id === activeId ? "bg-white/10 text-white" : "text-white/50 hover:bg-white/5 hover:text-white/80"
            }`}
            onClick={() => {
              selectSession(s.id);
              setSidebarOpen(false);
            }}
          >
            <span className="flex-1 min-w-0 truncate text-xs">{s.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteSession(s.id);
              }}
              className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-white text-sm leading-none px-1 transition-opacity"
              aria-label="Delete chat"
            >
              ×
            </button>
          </div>
        ))}
      </aside>

      {/* Conversation column — fills the space beside the sidebar and centers a 7xl-capped
          column, so the horizontal whitespace stays balanced (proportional) on wide screens. */}
      <div className="flex-1 min-w-0 flex md:justify-center">
        <div className="w-full max-w-7xl flex flex-col gap-4">
        {/* mobile: reveal the sessions list */}
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="md:hidden self-start text-white/50 text-xs hover:text-white/80 transition-colors"
        >
          ☰ Chats ({sessions.length})
        </button>

        {!empty && (
          <div ref={scrollRef} className="flex flex-col gap-4 h-[calc(100vh-22rem)] max-h-[46rem] min-h-[20rem] overflow-y-auto pr-1">
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div
                  key={i}
                  className="self-end max-w-[85%] bg-white/10 border border-white/15 btn-cut-sm px-3.5 py-2.5"
                >
                  <p className="text-white text-sm whitespace-pre-line">{m.text}</p>
                </div>
              ) : (
                <div key={i} className="flex flex-col gap-3">
                  <Proposal result={m.result} executor={executor} owner={address ?? undefined} />
                  {m.result.action.kind === "answer" && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-white/40 text-xs">Act on it:</span>
                      {["Supply 100 USDC", "Swap 100 USDm to EURm"].map((t) => (
                        <button
                          key={t}
                          onClick={() => run(t)}
                          className="text-xs text-white/70 border border-white/15 px-2.5 py-1.5 btn-cut-sm hover:text-white hover:border-white/30 transition-colors"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ),
            )}
            {loading && <p className="text-white/40 text-sm animate-pulse">Thinking…</p>}
          </div>
        )}

        {empty && (
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => run(p)}
                className="text-xs text-white/55 border border-white/12 px-2.5 py-1.5 btn-cut-sm hover:text-white hover:border-white/30 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void run(input);
              }
            }}
            placeholder={empty ? "Tell the agent what to do — or ask anything about Celo…" : "Reply…"}
            className="w-full bg-transparent border border-white/15 px-3 py-2.5 text-white text-sm placeholder:text-white/30 btn-cut-sm outline-none focus:border-white/40 resize-none"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={() => run(input)}
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-40 btn-cut"
            >
              {loading ? "Thinking…" : empty ? "Ask the agent" : "Send"}
            </button>
            {!empty && (
              <button
                onClick={() => newSession()}
                className="text-white/45 text-xs hover:text-white/80 transition-colors"
              >
                New chat
              </button>
            )}
          </div>
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
        </div>
      </div>
    </div>
  );
}

/** Inline **bold** → <strong>, everything else verbatim. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    /^\*\*[^*]+\*\*$/.test(part) ? (
      <strong key={i} className="text-white font-medium">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

/** Lightweight renderer for the agent's answer: headings (##/**bold line**), "- " bullets,
 *  blank-line spacing, and inline **bold** — no markdown dependency. */
function AnswerText({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];

  const flush = (key: string) => {
    if (!bullets.length) return;
    blocks.push(
      <ul key={key} className="list-disc pl-5 space-y-1 my-1 marker:text-white/30">
        {bullets.map((b, i) => (
          <li key={i} className="leading-relaxed">
            {inline(b)}
          </li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  lines.forEach((raw, i) => {
    const ln = raw.replace(/\s+$/, "");
    const bullet = ln.match(/^\s*[-*]\s+(.*)/);
    if (bullet) {
      bullets.push(bullet[1]);
      return;
    }
    flush(`ul-${i}`);
    if (ln.trim() === "") {
      blocks.push(<div key={`sp-${i}`} className="h-2" />);
      return;
    }
    const heading = ln.match(/^#{1,3}\s+(.*)/);
    if (heading) {
      blocks.push(
        <p key={`h-${i}`} className="text-white font-medium mt-1">
          {inline(heading[1])}
        </p>,
      );
      return;
    }
    blocks.push(
      <p key={`p-${i}`} className="leading-relaxed">
        {inline(ln)}
      </p>,
    );
  });
  flush("ul-end");

  return <div className="text-white/85 text-sm md:text-base flex flex-col">{blocks}</div>;
}

function Proposal({
  result,
  executor,
  owner,
}: {
  result: IntentResult;
  executor?: Address;
  owner?: Address;
}) {
  const a = result.action;

  if (a.kind === "answer") {
    return (
      <div className="border border-white/15 btn-cut-sm p-4 md:p-5">
        <p className="text-white/40 text-[11px] tracking-[0.18em] uppercase mb-2">The agent says</p>
        <AnswerText text={a.text} />
      </div>
    );
  }

  if (a.kind === "swap") {
    const q = result.quote;
    return (
      <div className="flex flex-col gap-3">
        <div className="border border-white/25 btn-cut-sm p-4 md:p-5">
          <p className="text-white/40 text-[11px] tracking-[0.18em] uppercase mb-2">The model advises</p>
          {q ? (
            <>
              <p className="text-white text-xl md:text-2xl font-normal tracking-[-0.01em]">
                Swap {a.amount} {q.from}{" "}
                <span className="text-white/45 text-base">
                  → ≈ {Number(q.amountOutHuman).toLocaleString(undefined, { maximumFractionDigits: 6 })} {q.to}
                </span>
              </p>
              <p className="text-white/35 text-xs font-mono mt-2 break-all">
                via Ubeswap V2 · {q.hops} hop{q.hops > 1 ? "s" : ""} · 1% max slippage · pool-depth verified ·
                recipient bound to you
              </p>
            </>
          ) : (
            <p className="text-sm" style={{ color: "#f87171" }}>
              Can't route this swap — {result.error ?? "no pool / too thin on Ubeswap V2"}.
            </p>
          )}
        </div>
        {q && (
          <div className="border border-white/12 btn-cut-sm p-4">
            <p className="text-white/40 text-[11px] tracking-[0.18em] uppercase mb-1.5">The chain decides</p>
            {result.dryRun ? (
              result.dryRun.ok ? (
                <p className="text-white text-sm">Allowed ✓ — the input pull is within your on-chain policy.</p>
              ) : (
                <p className="text-sm" style={{ color: "#f87171" }}>
                  Blocked — {result.dryRun.reason ?? "outside your policy"}.
                </p>
              )
            ) : (
              <p className="text-white/55 text-sm leading-relaxed">
                Authorize an agent (with {q.from} provisioned + Ubeswap allowlisted) to dry-run this against
                the gate. Output is <span className="text-white">bound to your wallet</span>; nothing executes
                until the gate approves.
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

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
      {executor && owner && (a.kind === "supply" || a.kind === "withdraw") && (
        <ExecuteButton action={a} executor={executor} owner={owner} />
      )}
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
  const amt = a.kind === "supply" || a.kind === "withdraw" ? Number(a.amount) / 1e6 : 0;
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
