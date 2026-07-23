import type { Address } from "viem";
import { celo, celoSepolia } from "./chains";

/** KaneVaultFactory address per chain (set after deploy, via .env). */
export const FACTORY: Record<number, Address | undefined> = {
  [celo.id]: import.meta.env.VITE_FACTORY_CELO || undefined,
  [celoSepolia.id]: import.meta.env.VITE_FACTORY_SEPOLIA || undefined,
};

export interface TokenInfo {
  symbol: string;
  address: Address;
  decimals: number;
}

/** Known stablecoins per chain. Mainnet is canonical; Sepolia tokens vary — extend as needed. */
export const TOKENS: Record<number, TokenInfo[]> = {
  [celo.id]: [
    { symbol: "USDC", address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C", decimals: 6 },
    { symbol: "cUSD", address: "0x765DE816845861e75A25fCA122bb6898B8B1282a", decimals: 18 },
  ],
  [celoSepolia.id]: [],
};

export function explorerFor(chainId: number): string {
  return chainId === celo.id ? "https://celoscan.io" : "https://celo-sepolia.blockscout.com";
}
