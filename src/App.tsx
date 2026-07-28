import { WagmiProvider, useChainId, useConnection } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "./config/wagmi";
import { FACTORY } from "./config/contracts";
import { useExecutor } from "./hooks/useExecutor";
import { ConnectWallet } from "./components/ConnectWallet";
import { AuthorizeAgent } from "./components/AuthorizeAgent";
import { PolicyCard } from "./components/PolicyCard";

const queryClient = new QueryClient();

function Console() {
  const { address, isConnected } = useConnection();
  const chainId = useChainId();
  const factory = FACTORY[chainId];
  const { executor } = useExecutor(factory, address);

  return (
    <div className="stack">
      <section className="card hero">
        <p className="kicker">Autonomous stablecoin agent · Celo</p>
        <p className="lead">
          <strong>KaneAI</strong> puts an AI agent to work on your stablecoins — earning yield,
          rebalancing, paying per call — without ever taking custody. The model proposes each
          move; a deterministic on-chain policy gate written in Solidity decides whether it runs.
          The agent can only touch what you allow, only where you allow, and every position
          settles straight back to your wallet.
        </p>
      </section>

      <section className="card">
        <h2>Wallet</h2>
        <p className="desc">
          Connect the wallet that owns the funds. This is the only key that can set policy — the
          agent never holds it.
        </p>
        <ConnectWallet />
      </section>

      {isConnected && (
        <>
          <section className="card">
            <h2>Authorize Agent</h2>
            <p className="desc">
              Deploy your personal executor and hand the agent a bounded mandate: spending caps,
              an allowlist of venues (here, Aave V3), and output locked to your address. Nothing
              in these steps grants custody — and you can revoke the mandate at any time.
            </p>
            {factory ? (
              <AuthorizeAgent factory={factory} />
            ) : (
              <p className="muted">
                No factory configured for this chain — deploy it and set{" "}
                <code>VITE_FACTORY_…</code>.
              </p>
            )}
          </section>

          {executor && address && (
            <section className="card">
              <h2>Policy</h2>
              <p className="desc">
                The guardrails currently enforced on-chain. The agent physically cannot exceed
                these — the contract reverts anything outside them.
              </p>
              <PolicyCard executor={executor} owner={address} />
            </section>
          )}
        </>
      )}
    </div>
  );
}

export function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <header className="topbar">
          <div className="brand">
            KaneAI <span className="muted">Console</span>
          </div>
          <div className="tagline small">The model advises; the chain decides.</div>
        </header>
        <main className="wrap">
          <Console />
        </main>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
