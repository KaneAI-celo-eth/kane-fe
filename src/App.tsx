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
      <section className="card">
        <h2>Wallet</h2>
        <ConnectWallet />
      </section>

      {isConnected && (
        <>
          <section className="card">
            <h2>Authorize Agent</h2>
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
          <div className="muted small">The model advises; the chain decides.</div>
        </header>
        <main className="wrap">
          <Console />
        </main>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
