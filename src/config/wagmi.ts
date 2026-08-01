import { http } from "wagmi";
// createConfig comes from @privy-io/wagmi (drop-in for wagmi's) so Privy manages the connectors.
import { createConfig } from "@privy-io/wagmi";
import { celo, celoSepolia } from "./chains";

// Dev override: point the Celo read transport at a local anvil fork via VITE_CELO_RPC
// (e.g. http://localhost:8545). Unset → the chain's default RPC (forno / mainnet).
const celoRpc = (import.meta.env.VITE_CELO_RPC as string | undefined) || undefined;

export const wagmiConfig = createConfig({
  chains: [celoSepolia, celo],
  transports: {
    [celo.id]: http(celoRpc),
    [celoSepolia.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
