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

/** The execute() payload the OWNER signs, built server-side (path resolution, amountOutMin, etc.). */
export type BuiltExecute = {
  executor: `0x${string}`;
  version: number;
  inputToken: `0x${string}`;
  inputAmount: bigint;
  dryRun?: DryRun;
  pulls: { token: `0x${string}`; amount: bigint }[];
  approvals: { token: `0x${string}`; spender: `0x${string}`; amount: bigint }[];
  calls: { target: `0x${string}`; value: bigint; data: `0x${string}` }[];
  quote?: { from: string; to: string; amountOutHuman: string; hops: number };
};

/** POST /build — the agent gateway returns the execute() payload for `action`, for the OWNER to
 *  sign themselves (approve the input token, then call execute()). Bigints come back as strings. */
export async function buildExecute(
  action: ProposedAction,
  owner: string,
): Promise<BuiltExecute> {
  const res = await fetch(`${AGENT_API}/build`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ owner, action }),
  });
  const b = (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: string };
  if (!res.ok) throw new Error(b.error ?? `HTTP ${res.status}`);
  return {
    executor: b.executor as `0x${string}`,
    version: Number(b.version),
    inputToken: b.inputToken as `0x${string}`,
    inputAmount: BigInt(b.inputAmount as string),
    dryRun: b.dryRun as DryRun | undefined,
    pulls: (b.pulls as { token: `0x${string}`; amount: string }[]).map((p) => ({ token: p.token, amount: BigInt(p.amount) })),
    approvals: (b.approvals as { token: `0x${string}`; spender: `0x${string}`; amount: string }[]).map((a) => ({ token: a.token, spender: a.spender, amount: BigInt(a.amount) })),
    calls: (b.calls as { target: `0x${string}`; value: string; data: `0x${string}` }[]).map((cl) => ({ target: cl.target, value: BigInt(cl.value), data: cl.data })),
    quote: b.quote as BuiltExecute["quote"],
  };
}

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
  return (await fetchGatewayInfo())?.agent ?? null;
}

/** GET /health → gateway info: the agent signer + whether x402 (pay-per-prompt) is active. */
export async function fetchGatewayInfo(): Promise<{ agent: `0x${string}` | null; x402: boolean } | null> {
  try {
    const res = await fetch(`${AGENT_API}/health`);
    if (!res.ok) return null;
    const h = (await res.json()) as { agent?: string | null; x402?: boolean };
    return {
      agent: h.agent && h.agent.startsWith("0x") ? (h.agent as `0x${string}`) : null,
      x402: Boolean(h.x402),
    };
  } catch {
    return null;
  }
}

/** POST /intent — the model proposes a concrete action (and dry-runs it when an executor exists).
 *  `history` carries prior turns for a multi-turn chat. `payFetch` (from makePayFetch) auto-pays
 *  the 0.01 USDC-per-prompt x402 charge when the gateway requires it; omit for free/dev. */
export async function proposeIntent(
  intent: string,
  owner?: string,
  history?: ChatTurn[],
  payFetch: typeof fetch = fetch,
): Promise<IntentResult> {
  const res = await payFetch(`${AGENT_API}/intent`, {
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
