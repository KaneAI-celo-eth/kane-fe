import { useState } from "react";
import { WagmiProvider, useChainId, useConnection } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Address } from "viem";
import { wagmiConfig } from "./config/wagmi";
import { FACTORY } from "./config/contracts";
import { ConnectWallet } from "./components/ConnectWallet";
import { CreateVault } from "./components/CreateVault";
import { PolicyCard } from "./components/PolicyCard";

const queryClient = new QueryClient();

function Console() {
  const { isConnected } = useConnection();
  const chainId = useChainId();
  const [vault, setVault] = useState<Address>();
  const factory = FACTORY[chainId];

  return (
    <div className="stack">
      <section className="card">
        <h2>Wallet</h2>
        <ConnectWallet />
      </section>

      {isConnected && (
        <>
          <section className="card">
            <h2>Vault</h2>
            {factory ? (
              <CreateVault onVault={setVault} />
            ) : (
              <p className="muted">
                No factory configured for this chain — deploy it and set{" "}
                <code>VITE_FACTORY_…</code>.
              </p>
            )}
          </section>

          {vault && (
            <section className="card">
              <h2>Policy</h2>
              <PolicyCard vault={vault} />
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
