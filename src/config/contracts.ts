import type { Address } from "viem";
import { celo, celoSepolia } from "./chains";

/**
 * KaneExecutorFactory address per chain. The mainnet factory is the canonical deployed
 * singleton — a UUPS proxy (Celo mainnet, 2026-07-28, verified on Celoscan) — baked in like
 * USDC/Aave below; `VITE_FACTORY_*` still overrides it per build (e.g. an anvil fork).
 */
const CELO_FACTORY = "0x1CB84F7597A97A6c6BEE5CcE3AF4E1fBF02E0981";
export const FACTORY: Record<number, Address | undefined> = {
  [celo.id]: (import.meta.env.VITE_FACTORY_CELO as Address | undefined) || CELO_FACTORY,
  [celoSepolia.id]: (import.meta.env.VITE_FACTORY_SEPOLIA as Address | undefined) || undefined,
};

/** Resolve the factory address for a chain (undefined until deployed + set in .env). */
export function factoryAddress(chainId: number): Address | undefined {
  return FACTORY[chainId];
}

/** Canonical Celo mainnet USDC (6d) — the demo rebalance asset. */
export const USDC_CELO: Address = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";

/** Mento stablecoins (18d) — the deep-pool swap pair on Ubeswap V2 (per Celopedia). */
export const USDM_CELO: Address = "0x765DE816845861e75A25fCA122bb6898B8B1282a";
export const EURM_CELO: Address = "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73";

/**
 * Ubeswap V2 (Uniswap-V2 fork) on Celo mainnet — the swap venue. `swapExactTokensForTokens(uint,
 * uint, address[] path, address to, uint deadline)` puts `to` at a STATIC head word (index 3), so
 * the executor binds the swap recipient to the owner. Sourced from Celopedia.
 */
export const UBESWAP: Record<number, { router: Address } | undefined> = {
  [celo.id]: { router: "0xE3D8bd6Aed4F159bc8000a9cD47CffDb95F96121" },
  [celoSepolia.id]: undefined,
};

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
    { symbol: "USDm", address: USDM_CELO, decimals: 18 },
    { symbol: "EURm", address: EURM_CELO, decimals: 18 },
  ],
  [celoSepolia.id]: [],
};

export function explorerFor(chainId: number): string {
  return chainId === celo.id ? "https://celoscan.io" : "https://celo-sepolia.blockscout.com";
}
