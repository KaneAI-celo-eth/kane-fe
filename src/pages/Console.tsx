import { WagmiProvider, useChainId, useConnection } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Link } from "react-router";
import { wagmiConfig } from "../config/wagmi";
import { FACTORY } from "../config/contracts";
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

function ConsoleBody() {
  const { address, isConnected } = useConnection();
  const chainId = useChainId();
  const factory = FACTORY[chainId];
  const { executor } = useExecutor(factory, address);

  return (
    <div className="flex flex-col gap-4">
      <Card
        label="Agent · the model advises"
        desc="Tell the agent what you want in plain language. It proposes one concrete move — never an address — then the on-chain policy gate decides whether it runs."
      >
        <AgentPanel />
      </Card>

      {isConnected ? (
        <>
          <Card
            label="Authorize agent"
            desc="Deploy your personal executor and hand the agent a bounded mandate: spending caps, an allowlist of venues (Aave V3), and output locked to your address. Nothing here grants custody — revoke anytime."
          >
            {factory ? (
              <AuthorizeAgent factory={factory} />
            ) : (
              <p className="text-white/55 text-sm leading-relaxed">
                No factory configured for this chain — switch to <strong className="text-white">Celo
                Mainnet</strong> to authorize an agent.
              </p>
            )}
          </Card>

          {executor && address && (
            <Card
              label="Policy"
              desc="The guardrails currently enforced on-chain. The agent physically cannot exceed these — the contract reverts anything outside them."
            >
              <PolicyCard executor={executor} owner={address} />
            </Card>
          )}
        </>
      ) : (
        <p className="text-white/45 text-sm leading-relaxed">
          Connect your wallet (top-right) to authorize an agent and set its on-chain policy.
        </p>
      )}
    </div>
  );
}

export function Console() {
  return (
    <div className="min-h-screen w-full bg-black p-3 md:p-4 font-inter">
      <div className="w-full min-h-[calc(100vh-1.5rem)] md:min-h-[calc(100vh-2rem)] rounded-2xl relative overflow-hidden bg-black flex flex-col">
        {/* same brand-built loop as the landing, dimmed hard so the dense console stays readable */}
        <video
          src="/kane-bg.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/75 to-black/80" />

        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
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
            <div className="relative z-10 flex-1 w-full max-w-3xl mx-auto px-6 md:px-10 py-10 md:py-12 anim-fade">
              <p className="text-white/50 text-xs tracking-[0.2em] uppercase mb-3">Console</p>
              <h1 className="text-white text-3xl md:text-4xl font-normal leading-[1.1] tracking-[-0.03em]">
                Authorize your agent.
              </h1>
              <p className="text-white/65 text-base leading-relaxed mt-4 max-w-2xl">
                The model proposes; the on-chain policy gate decides. Set the limits here — the agent
                works only inside them, and every position settles back to your wallet.
              </p>

              <div className="mt-8">
                <ConsoleBody />
              </div>
            </div>
          </QueryClientProvider>
        </WagmiProvider>
      </div>
    </div>
  );
}
