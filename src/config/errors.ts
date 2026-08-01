/**
 * Turn a viem/wagmi transaction error into a short, human message — never the raw
 * multi-line dump with the full calldata that viem attaches to `.message`.
 */
export function friendlyTxError(err: unknown): string {
  const raw =
    (err as { shortMessage?: string })?.shortMessage ??
    (err instanceof Error ? err.message : String(err));
  const lower = raw.toLowerCase();

  if (lower.includes("exceeds the balance") || lower.includes("insufficient funds")) {
    return "Not enough CELO to pay gas. Fund this wallet with a little CELO (Celo Mainnet), then try again.";
  }
  if (
    lower.includes("user rejected") ||
    lower.includes("user denied") ||
    lower.includes("rejected the request")
  ) {
    return "Signature rejected.";
  }
  if (lower.includes("chain mismatch") || lower.includes("does not match the target chain")) {
    return "Wrong network — switch your wallet to Celo Mainnet.";
  }

  // Fallback: first line only, capped — no calldata walls.
  const firstLine = raw.split("\n")[0].trim();
  return firstLine.length > 160 ? firstLine.slice(0, 160) + "…" : firstLine;
}
