import type { PrivyClientConfig } from "@privy-io/react-auth";
import { celo, celoSepolia } from "./chains";

/**
 * Privy App ID. Create an app at https://dashboard.privy.io and set `VITE_PRIVY_APP_ID`
 * (Vercel env for prod, `.env.local` for dev). Without it, Privy cannot initialize.
 */
export const PRIVY_APP_ID = (import.meta.env.VITE_PRIVY_APP_ID as string | undefined) ?? "";

/**
 * Login = external wallets + email + Google. Email/social users get a **self-custodial embedded
 * wallet** (created on login); external-wallet users keep their own. Chain is Celo (mainnet default,
 * Sepolia supported). The wagmi hooks used across the app (useConnection / useWriteContract /
 * useWalletClient) read whichever wallet Privy makes active — see `ConnectWallet`.
 */
export const privyConfig: PrivyClientConfig = {
  loginMethods: ["wallet", "email", "google"],
  appearance: {
    theme: "dark",
    accentColor: "#F7C948", // Celo-gold accent, matches the brand background
    walletChainType: "ethereum-only",
  },
  embeddedWallets: {
    ethereum: { createOnLogin: "users-without-wallets" },
  },
  defaultChain: celo,
  supportedChains: [celo, celoSepolia],
};
