import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import { KaneMark } from "../components/KaneMark";

const DOCS_URL = "https://github.com/KaneAI-celo-eth/.github";

// Minimal EIP-1193 surface — enough to greet the owner's wallet without pulling
// the full wagmi/viem console stack (that lands with the mainnet console).
type Eip1193 = { request(args: { method: string; params?: unknown[] }): Promise<unknown> };
// (No global `Window.ethereum` augmentation here — the wallet libraries declare it globally now;
//  this unrouted page reads it via a local cast to avoid clashing with their type.)

const STEPS = [
  {
    title: "Connect your wallet",
    body: "The wallet that owns the funds. KaneAI signs with a delegated key — it never holds yours.",
  },
  {
    title: "Authorize an agent",
    body: "Deploy your personal executor and set the rules: spending caps, an allowlist of venues, output bound back to you.",
  },
  {
    title: "Let it work",
    body: "The agent proposes a rebalance; your on-chain policy decides; every position settles back to your wallet. Revoke anytime.",
  },
];

export function GetStarted() {
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function connect() {
    setError(null);
    const eth = (window as unknown as { ethereum?: Eip1193 }).ethereum;
    if (!eth) {
      setError("No EVM wallet found — install MetaMask or a Celo-compatible wallet, then retry.");
      return;
    }
    setBusy(true);
    try {
      const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      setAddress(accounts?.[0] ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection was rejected.");
    } finally {
      setBusy(false);
    }
  }

  const short = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : null;

  return (
    <div className="min-h-screen w-full bg-black p-3 md:p-4 font-inter">
      <div className="w-full min-h-[calc(100vh-1.5rem)] md:min-h-[calc(100vh-2rem)] rounded-2xl relative overflow-hidden bg-black flex flex-col">
        {/* faint watermark mark */}
        <KaneMark className="pointer-events-none absolute -right-24 -bottom-24 w-[520px] h-[520px] opacity-[0.04]" />

        {/* ------------------------------------------------------------ nav */}
        <nav className="relative z-10 flex items-center justify-between px-6 md:px-10 pt-6 md:pt-8">
          <Link to="/" className="flex items-center gap-3 group">
            <KaneMark className="w-11 h-11 md:w-12 md:h-12" />
            <span className="text-white text-[10px] md:text-xs tracking-[0.4em] font-light">
              K A N E A I
            </span>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2 px-5 py-2.5 text-white text-sm hover:bg-white/10 btn-cut-border"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Home</span>
          </Link>
        </nav>

        {/* --------------------------------------------------------- content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-6 md:px-10 py-10 md:py-14 max-w-4xl w-full mx-auto anim-fade">
          <p className="text-white/50 text-xs tracking-[0.2em] uppercase mb-3">Get started</p>
          <h1 className="text-white text-3xl md:text-5xl font-normal leading-[1.1] tracking-[-0.03em]">
            Authorize an agent.
            <br />
            Keep your keys.
          </h1>
          <p className="text-white/70 text-base md:text-lg leading-relaxed mt-5 max-w-2xl">
            KaneAI runs behind your own on-chain executor. In three steps you set the limits,
            and the agent works only inside them — non-custodial, bounded by code.
          </p>

          {/* steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
            {STEPS.map((s, i) => (
              <div key={s.title} className="border border-white/15 p-5 btn-cut-sm">
                <div className="text-white/40 text-sm font-mono mb-3">0{i + 1}</div>
                <h3 className="text-white text-base font-medium mb-2">{s.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>

          {/* connect + status */}
          <div className="mt-10 flex flex-col gap-4">
            {short ? (
              <div className="border border-white/20 p-5 btn-cut-sm">
                <p className="text-white text-sm">
                  Wallet connected · <span className="font-mono text-white/80">{short}</span>
                </p>
                <p className="text-white/60 text-sm mt-2 leading-relaxed">
                  You're ready. The full console — authorize agent, set caps, review policy —
                  unlocks with our <span className="text-white">Celo mainnet</span> launch.
                </p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <button
                  onClick={connect}
                  disabled={busy}
                  className="px-7 py-3.5 bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-50 btn-cut"
                >
                  {busy ? "Check your wallet…" : "Connect wallet"}
                </button>
                <p className="text-white/50 text-sm max-w-sm">
                  Connect to check compatibility. The console goes live at mainnet launch — no
                  funds move today.
                </p>
              </div>
            )}
            {error && <p className="text-sm" style={{ color: "#f87171" }}>{error}</p>}
          </div>

          {/* footer links */}
          <div className="mt-12 flex items-center gap-5 text-sm">
            <a
              href={DOCS_URL}
              target="_blank"
              rel="noreferrer"
              className="text-white/60 hover:text-white transition-colors underline underline-offset-4"
            >
              How it works
            </a>
            <Link to="/" className="text-white/60 hover:text-white transition-colors">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
