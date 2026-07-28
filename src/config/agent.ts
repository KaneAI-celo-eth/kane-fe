// The kane-be agent gateway. The console asks it for a proposal; the model advises.
export const AGENT_API =
  (import.meta.env as Record<string, string | undefined>).VITE_AGENT_API ?? "http://localhost:8787";

export type ProposedAction =
  | { kind: "answer"; text: string }
  | { kind: "supply"; amount: string }
  | { kind: "withdraw"; amount: string }
  | { kind: "swap"; from: string; to: string; amount: string }
  | { kind: "noop"; reason: string };

export type DryRun = { ok: boolean; reason?: string };

export type SwapQuote = {
  from: string;
  to: string;
  amountIn: string;
  amountOut: string;
  amountOutHuman: string;
  amountOutMin: string;
  hops: number;
};

export type IntentResult = {
  action: ProposedAction;
  executor?: string;
  dryRun?: DryRun;
  quote?: SwapQuote;
  error?: string;
};

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type ExecuteResult = {
  action: ProposedAction;
  executed: boolean;
  txHash?: string;
  dryRun?: DryRun;
  error?: string;
};

/** POST /execute — the agent (kane-be's central signer) executes EXACTLY this proposed action
 *  against the owner's executor: dry-run → attribution-tagged `execute()`. The owner grants the
 *  ERC-20 allowance separately (just-in-time), in their own wallet, before calling this. */
export async function executeAction(action: ProposedAction, owner: string): Promise<ExecuteResult> {
  const res = await fetch(`${AGENT_API}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ owner, action }),
  });
  const body = (await res.json().catch(() => ({}))) as ExecuteResult & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body;
}

/** GET /health → KaneAI's dedicated agent signer address (the key the runtime signs with),
 *  or null if the backend has no key configured / is unreachable. The console authorizes THIS
 *  address — the user never has to know or type it. */
export async function fetchAgentAddress(): Promise<`0x${string}` | null> {
  try {
    const res = await fetch(`${AGENT_API}/health`);
    if (!res.ok) return null;
    const h = (await res.json()) as { agent?: string | null };
    return h.agent && h.agent.startsWith("0x") ? (h.agent as `0x${string}`) : null;
  } catch {
    return null;
  }
}

/** POST /intent — the model proposes a concrete action (and dry-runs it when an executor exists).
 *  `history` carries prior turns for a multi-turn chat. */
export async function proposeIntent(
  intent: string,
  owner?: string,
  history?: ChatTurn[],
): Promise<IntentResult> {
  const res = await fetch(`${AGENT_API}/intent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      intent,
      ...(owner ? { owner } : {}),
      ...(history && history.length ? { history } : {}),
    }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as IntentResult;
}
