import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { celo, celoSepolia } from "./chains";

// Dev override: point the Celo read transport at a local anvil fork via VITE_CELO_RPC
// (e.g. http://localhost:8545). Unset → the chain's default RPC (forno / mainnet).
const celoRpc = (import.meta.env.VITE_CELO_RPC as string | undefined) || undefined;

export const wagmiConfig = createConfig({
  chains: [celoSepolia, celo],
  connectors: [injected()],
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
