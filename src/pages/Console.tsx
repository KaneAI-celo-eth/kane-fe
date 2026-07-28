import { WagmiProvider, useChainId, useConnection } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Link } from "react-router";
import { wagmiConfig } from "../config/wagmi";
import { FACTORY } from "../config/contracts";
import { useExecutor } from "../hooks/useExecutor";
import { ConnectWallet } from "../components/ConnectWallet";
import { AuthorizeAgent } from "../components/AuthorizeAgent";
import { PolicyCard } from "../components/PolicyCard";
import "../console.css";

const queryClient = new QueryClient();

function ConsoleBody() {
  const { address, isConnected } = useConnection();
  const chainId = useChainId();
  const factory = FACTORY[chainId];
  const { executor } = useExecutor(factory, address);

  return (
    <div className="stack">
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
                No factory configured for this chain yet — the console goes live with the Celo
                mainnet deployment. (<code>VITE_FACTORY_…</code>)
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

export function Console() {
  return (
    <div className="kane-console">
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <header className="topbar">
            <div className="brand">
              <Link to="/">KaneAI</Link> <span className="muted">Console</span>
            </div>
            <div className="tagline small">The model advises; the chain decides.</div>
          </header>
          <main className="wrap">
            <ConsoleBody />
          </main>
        </QueryClientProvider>
      </WagmiProvider>
    </div>
  );
}
