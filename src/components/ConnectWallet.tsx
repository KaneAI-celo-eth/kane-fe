import {
  useChainId,
  useConnect,
  useConnection,
  useConnectors,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { celo, celoSepolia } from "../config/chains";

export function ConnectWallet() {
  const { address, isConnected } = useConnection();
  const connectors = useConnectors();
  const { mutate: connect, isPending } = useConnect();
  const { mutate: disconnect } = useDisconnect();
  const chainId = useChainId();
  const { mutate: switchChain } = useSwitchChain();

  if (!isConnected) {
    const injected = connectors[0];
    return (
      <button
        className="px-5 py-2.5 bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-50 btn-cut"
        disabled={!injected || isPending}
        onClick={() => injected && connect({ connector: injected })}
      >
        {isPending ? "Connecting…" : "Connect wallet"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="border border-white/20 px-3 py-1.5 text-sm font-mono text-white/80 btn-cut-sm">
        {address?.slice(0, 6)}…{address?.slice(-4)}
      </span>
      <select
        className="bg-black text-white border border-white/15 px-3 py-2 text-sm btn-cut-sm outline-none focus:border-white/40"
        value={chainId}
        onChange={(e) =>
          switchChain({ chainId: Number(e.target.value) as typeof celo.id | typeof celoSepolia.id })
        }
      >
        <option value={celoSepolia.id}>Celo Sepolia</option>
        <option value={celo.id}>Celo Mainnet</option>
      </select>
      <button
        className="px-5 py-2.5 text-white text-sm hover:bg-white/10 btn-cut-border"
        onClick={() => disconnect()}
      >
        Disconnect
      </button>
    </div>
  );
}
