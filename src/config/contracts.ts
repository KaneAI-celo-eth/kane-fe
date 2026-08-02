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

/** Mento stablecoins (18d) — USDm/EURm swap on Ubeswap V2; the local currencies below swap on
 *  Mento V3 (per Celopedia). */
export const USDM_CELO: Address = "0x765DE816845861e75A25fCA122bb6898B8B1282a";
export const EURM_CELO: Address = "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73";

/** Mento local-currency stablecoins (all 18d) — liquidity is on Mento V3, not Ubeswap. */
export const MENTO_STABLES: Record<string, Address> = {
  BRLm: "0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787",
  XOFm: "0x73F93dcc49cB8A239e2032663e9475dd5ef29A08",
  KESm: "0x456a3D042C0DbD3db53D5489e98dFb038553B0d0",
  NGNm: "0xE2702Bd97ee33c88c8f6f92DA3B733608aa76F71",
  COPm: "0x8A567e2aE79CA692Bd748aB832081C45de4041eA",
  GBPm: "0xCCF663b1fF11028f0b19058d0f7B674004a40746",
  CHFm: "0xb55a79F398E759E43C95b979163f30eC87Ee131D",
  JPYm: "0xc45eCF20f3CD864B32D9794d6f76814aE8892e20",
  AUDm: "0x7175504C455076F15c04A2F90a8e352281F492F9",
  CADm: "0xff4Ab19391af240c311c54200a492233052B6325",
  GHSm: "0xfAeA5F3404bbA20D3cc2f8C4B0A888F55a3c7313",
  PHPm: "0x105d4A9306D2E55a71d2Eb95B81553AE1dC20d7B",
  ZARm: "0x4c35853A3B4e647fD266f4de678dCc8fEC410BF6",
};

/**
 * Mento V3 Router — the SECOND swap venue (Celo mainnet). Its `swap(...)` selector `0x3375aa2a`
 * puts the recipient at STATIC head word index 3, so the executor binds it to the owner exactly
 * like Ubeswap's `to`. Verified via the Mento SDK; sourced from Celopedia.
 */
export const MENTO: Record<number, { router: Address } | undefined> = {
  [celo.id]: { router: "0x4861840C2EfB2b98312B0aE34d86fD73E8f9B6f6" },
  [celoSepolia.id]: undefined,
};
export const MENTO_SWAP_SELECTOR = "0x3375aa2a" as const;
export const MENTO_RECIPIENT_WORD_INDEX = 3;

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
    // Mento local-currency stables (18d) — swap on Mento V3.
    ...Object.entries(MENTO_STABLES).map(([symbol, address]) => ({ symbol, address, decimals: 18 })),
  ],
  [celoSepolia.id]: [],
};

export function explorerFor(chainId: number): string {
  return chainId === celo.id ? "https://celoscan.io" : "https://celo-sepolia.blockscout.com";
}
