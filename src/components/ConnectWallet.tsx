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
        className="btn"
        disabled={!injected || isPending}
        onClick={() => injected && connect({ connector: injected })}
      >
        {isPending ? "Connecting…" : "Connect Wallet"}
      </button>
    );
  }

  return (
    <div className="row">
      <span className="pill mono">
        {address?.slice(0, 6)}…{address?.slice(-4)}
      </span>
      <select
        value={chainId}
        onChange={(e) =>
          switchChain({ chainId: Number(e.target.value) as typeof celo.id | typeof celoSepolia.id })
        }
      >
        <option value={celoSepolia.id}>Celo Sepolia</option>
        <option value={celo.id}>Celo Mainnet</option>
      </select>
      <button className="btn ghost" onClick={() => disconnect()}>
        Disconnect
      </button>
    </div>
  );
}
