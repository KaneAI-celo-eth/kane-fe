import { useChainId, useConnection } from "wagmi";
import { WagmiProvider } from "@privy-io/wagmi"; // drop-in for wagmi's — Privy manages the wallet
import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Link } from "react-router";
import { wagmiConfig } from "../config/wagmi";
import { privyConfig, PRIVY_APP_ID } from "../config/privy";
import { FACTORY, explorerFor } from "../config/contracts";
import { useExecutor } from "../hooks/useExecutor";
import { ConnectWallet } from "../components/ConnectWallet";
import { AuthorizeAgent } from "../components/AuthorizeAgent";
import { PolicyCard } from "../components/PolicyCard";
import { AgentPanel } from "../components/AgentPanel";
import { KaneMark } from "../components/KaneMark";

const queryClient = new QueryClient();

function Card({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="border border-white/15 btn-cut-sm p-5 md:p-6 bg-black/40 backdrop-blur-md">
      <p className="text-white/45 text-xs tracking-[0.18em] uppercase mb-2">{label}</p>
      {desc && <p className="text-white/55 text-sm leading-relaxed mb-4 max-w-xl">{desc}</p>}
      {children}
    </section>
  );
}

/** A centered, minimal panel — used for connect / wrong-chain / onboarding so the screen never
 *  feels lopsided. Kept intentionally sparse: a mark, one line, and (optionally) one action. */
function Centered({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex items-center justify-center anim-fade">
      <div className="w-full max-w-sm flex flex-col items-center text-center gap-5">
        <KaneMark className="w-14 h-14 opacity-90" />
        <div className="flex flex-col gap-2">
          <h1 className="text-white text-3xl md:text-4xl font-normal tracking-[-0.03em]">{title}</h1>
          <p className="text-white/55 text-sm leading-relaxed">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConsoleBody() {
  const { address, isConnected } = useConnection();
  const chainId = useChainId();
  const factory = FACTORY[chainId];
  const { executor } = useExecutor(factory, address);

  // 1) Not connected.
  if (!isConnected) {
    return (
      <Centered
        title="Connect to start"
        subtitle="Connect your wallet (top-right) to deploy your agent."
      />
    );
  }

  // 2) Wrong chain.
  if (!factory) {
    return <Centered title="Switch network" subtitle="Switch to Celo Mainnet to authorize an agent." />;
  }

  // 3) No executor yet → minimal, centered onboarding. One action: authorize.
  if (!executor) {
    return (
      <Centered title="Authorize your agent" subtitle="One signature. Non-custodial — you keep custody, revoke anytime.">
        <div className="w-full max-w-xs mt-1">
          <AuthorizeAgent factory={factory} />
        </div>
      </Centered>
    );
  }

  // 4) Registered → the chat is the hero, above an executor-info bar + the live policy.
  return (
    <div className="anim-fade">
      <p className="text-white/50 text-xs tracking-[0.2em] uppercase mb-3">Console</p>
      <h1 className="text-white text-3xl md:text-4xl font-normal leading-[1.1] tracking-[-0.03em]">
        Talk to your agent.
      </h1>
      <p className="text-white/65 text-base leading-relaxed mt-4 max-w-2xl">
        Tell it what you want in plain language. It proposes one concrete move — your on-chain
        policy decides whether it runs.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 border border-white/12 btn-cut-sm px-4 py-3 bg-black/40 backdrop-blur-md">
        <span className="text-white/40 text-[11px] tracking-[0.18em] uppercase">Your executor</span>
        <a
          href={`${explorerFor(chainId)}/address/${executor}`}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-white/80 text-sm underline underline-offset-4 hover:text-white break-all"
        >
          {executor}
        </a>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <Card label="Agent · the model advises">
          <AgentPanel executor={executor} />
        </Card>

        {address && (
          <Card label="Policy" desc="The guardrails enforced on-chain — the agent can't exceed them.">
            <PolicyCard executor={executor} owner={address} />
          </Card>
        )}
      </div>
    </div>
  );
}

export function Console() {
  // Privy needs an App ID. Fail soft with a clear message instead of a white screen.
  if (!PRIVY_APP_ID) {
    return (
      <div className="min-h-screen w-full bg-black flex items-center justify-center p-8 font-inter">
        <p className="text-white/60 text-sm text-center max-w-sm leading-relaxed">
          Wallet login isn't configured yet. Set <code className="text-white/85">VITE_PRIVY_APP_ID</code>{" "}
          (a Privy App ID from dashboard.privy.io) and rebuild.
        </p>
      </div>
    );
  }
  return (
    <div className="min-h-screen w-full bg-black p-3 md:p-4 font-inter">
      <div className="w-full min-h-[calc(100vh-1.5rem)] md:min-h-[calc(100vh-2rem)] rounded-2xl relative overflow-hidden bg-black flex flex-col">
        {/* same brand-built loop as the landing, dimmed so the console stays readable */}
        <video
          src="/kane-bg.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/50 to-black/70" />

        <PrivyProvider appId={PRIVY_APP_ID} config={privyConfig}>
          <QueryClientProvider client={queryClient}>
            <WagmiProvider config={wagmiConfig}>
            {/* nav — wallet connect lives here, top-right */}
            <nav className="relative z-10 flex items-center justify-between gap-4 px-6 md:px-10 pt-6 md:pt-8">
              <Link to="/" className="flex items-center gap-3">
                <KaneMark className="w-11 h-11 md:w-12 md:h-12" />
                <span className="text-white text-[10px] md:text-xs tracking-[0.4em] font-light">
                  K A N E A I
                </span>
              </Link>
              <ConnectWallet />
            </nav>

            {/* content */}
            <div className="relative z-10 flex-1 w-full flex flex-col px-6 md:px-32 py-10 md:py-12">
              <ConsoleBody />
            </div>
            </WagmiProvider>
          </QueryClientProvider>
        </PrivyProvider>
      </div>
    </div>
  );
}
