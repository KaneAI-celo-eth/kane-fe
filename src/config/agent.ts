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
