import { useEffect } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useSetActiveWallet } from "@privy-io/wagmi";
import { useConnection } from "wagmi";

/**
 * Wallet connect via Privy — one button opens the Privy modal (external wallet, email, or Google).
 * Email/social users get a self-custodial embedded wallet. The rest of the app reads the wallet
 * through wagmi (`useConnection`), so we bridge Privy's active wallet into wagmi here.
 */
export function ConnectWallet() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const { setActiveWallet } = useSetActiveWallet();
  const { address, isConnected } = useConnection();

  // Once logged in, make the primary Privy wallet the active wagmi wallet so useConnection /
  // useWriteContract / useWalletClient (used across the console) see it.
  useEffect(() => {
    if (authenticated && wallets[0] && !isConnected) {
      void setActiveWallet(wallets[0]);
    }
  }, [authenticated, wallets, isConnected, setActiveWallet]);

  if (!ready) {
    return (
      <button className="px-5 py-2.5 bg-white/80 text-black text-sm font-medium btn-cut" disabled>
        Loading…
      </button>
    );
  }

  if (!authenticated) {
    return (
      <button
        className="px-5 py-2.5 bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors btn-cut"
        onClick={() => login()}
      >
        Connect wallet
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="border border-white/20 px-3 py-1.5 text-sm font-mono text-white/80 btn-cut-sm">
        {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Connecting…"}
      </span>
      <button
        className="px-5 py-2.5 text-white text-sm hover:bg-white/10 btn-cut-border"
        onClick={() => logout()}
      >
        <span>Disconnect</span>
      </button>
    </div>
  );
}
