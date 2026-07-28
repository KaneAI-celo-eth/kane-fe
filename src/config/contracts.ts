import type { Address } from "viem";
import { celo, celoSepolia } from "./chains";

/** KaneExecutorFactory address per chain (set after deploy, via .env). */
export const FACTORY: Record<number, Address | undefined> = {
  [celo.id]: import.meta.env.VITE_FACTORY_CELO || undefined,
  [celoSepolia.id]: import.meta.env.VITE_FACTORY_SEPOLIA || undefined,
};

/** Resolve the factory address for a chain (undefined until deployed + set in .env). */
export function factoryAddress(chainId: number): Address | undefined {
  return FACTORY[chainId];
}

/** Canonical Celo mainnet USDC (6d) — the demo rebalance asset. */
export const USDC_CELO: Address = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";

/**
 * Aave V3 on Celo (mainnet). Sourced from Celopedia `references/contracts.md`.
 * `dataProvider` resolves the aToken (aUSDC) on demand — the executor supplies USDC and
 * pulls the resulting aUSDC on withdraw. Aave V3 is not deployed on Celo Sepolia.
 */
export const AAVE: Record<number, { pool: Address; dataProvider: Address } | undefined> = {
  [celo.id]: {
    pool: "0x3E59A31363E2ad014dcbc521c4a0d5757d9f3402",
    dataProvider: "0x2e0f8D3B1631296cC7c56538D6Eb6032601E15ED",
  },
  [celoSepolia.id]: undefined,
};

export interface TokenInfo {
  symbol: string;
  address: Address;
  decimals: number;
}

/** Known stablecoins per chain. Mainnet is canonical; Sepolia tokens vary — extend as needed. */
export const TOKENS: Record<number, TokenInfo[]> = {
  [celo.id]: [
    { symbol: "USDC", address: USDC_CELO, decimals: 6 },
    { symbol: "cUSD", address: "0x765DE816845861e75A25fCA122bb6898B8B1282a", decimals: 18 },
  ],
  [celoSepolia.id]: [],
};

export function explorerFor(chainId: number): string {
  return chainId === celo.id ? "https://celoscan.io" : "https://celo-sepolia.blockscout.com";
}
