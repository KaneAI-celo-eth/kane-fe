import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { celo, celoSepolia } from "./chains";

export const wagmiConfig = createConfig({
  chains: [celoSepolia, celo],
  connectors: [injected()],
  transports: {
    [celo.id]: http(),
    [celoSepolia.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
