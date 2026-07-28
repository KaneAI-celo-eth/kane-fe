// The kane-be agent gateway. The console asks it for a proposal; the model advises.
export const AGENT_API =
  (import.meta.env as Record<string, string | undefined>).VITE_AGENT_API ?? "http://localhost:8787";

export type ProposedAction =
  | { kind: "answer"; text: string }
  | { kind: "supply"; amount: string }
  | { kind: "withdraw"; amount: string }
  | { kind: "noop"; reason: string };

export type DryRun = { ok: boolean; reason?: string };

export type IntentResult = {
  action: ProposedAction;
  executor?: string;
  dryRun?: DryRun;
  error?: string;
};

/** POST /intent — the model proposes a concrete action (and dry-runs it when an executor exists). */
export async function proposeIntent(intent: string, owner?: string): Promise<IntentResult> {
  const res = await fetch(`${AGENT_API}/intent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(owner ? { intent, owner } : { intent }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as IntentResult;
}
