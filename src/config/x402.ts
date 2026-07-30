// x402 BUYER — pay 0.01 USDC per prompt with the connected wallet.
//
// The agent gateway charges per `POST /intent` (see kane-be x402/seller). Here we wrap fetch so
// that when the server answers 402 Payment Required, the wallet signs an EIP-3009 USDC
// authorization (gasless — the facilitator submits it) and the request is retried with payment.
// If the server doesn't gate (local/anvil dev returns 200), no payment is ever made.

import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import type { WalletClient } from "viem";

/** A minimal x402 ClientEvmSigner backed by the connected wallet: address + typed-data signing. */
function walletSigner(wallet: WalletClient) {
  const account = wallet.account;
  if (!account) throw new Error("wallet has no account");
  return {
    address: account.address,
    // x402 hands us the EIP-3009 typed data; the wallet signs it (MetaMask popup, no gas).
    signTypedData: (m: {
      domain: Record<string, unknown>;
      types: Record<string, unknown>;
      primaryType: string;
      message: Record<string, unknown>;
    }) =>
      wallet.signTypedData({
        account,
        domain: m.domain,
        types: m.types,
        primaryType: m.primaryType,
        message: m.message,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any) as Promise<`0x${string}`>,
  };
}

/**
 * A fetch that auto-pays x402 charges using `wallet` on `chainId`. Wrap the agent gateway calls
 * with this; it only pays when the server returns 402, otherwise it behaves like plain fetch.
 */
export function makePayFetch(wallet: WalletClient, chainId: number): typeof fetch {
  const client = new x402Client().register(
    `eip155:${chainId}`,
    new ExactEvmScheme(walletSigner(wallet)),
  );
  return wrapFetchWithPayment(fetch, client) as typeof fetch;
}
