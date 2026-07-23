import { useEffect, useState } from "react";
import { useChainId, useConnection } from "wagmi";
import { zeroAddress, type Address } from "viem";
import { FACTORY, TOKENS, explorerFor } from "../config/contracts";
import { useCreateVault } from "../hooks/useCreateVault";
import { useVaultOf } from "../hooks/useVault";

export function CreateVault({ onVault }: { onVault: (vault: Address) => void }) {
  const { address } = useConnection();
  const chainId = useChainId();
  const tokens = TOKENS[chainId] ?? [];
  const factory = FACTORY[chainId];

  const [token, setToken] = useState<Address | undefined>(tokens[0]?.address);
  const { createVault, hash, isPending, error } = useCreateVault();
  const { data: existing, refetch } = useVaultOf(factory, address, token);

  const hasVault = Boolean(existing && existing !== zeroAddress);

  useEffect(() => {
    if (existing && existing !== zeroAddress) onVault(existing);
  }, [existing, onVault]);

  // Re-resolve after a create tx is submitted.
  useEffect(() => {
    if (hash) void refetch();
  }, [hash, refetch]);

  if (tokens.length === 0) {
    return (
      <p className="muted">
        No known tokens for this chain yet — add one in <code>config/contracts.ts</code>.
      </p>
    );
  }

  return (
    <div className="stack">
      <label className="field">
        <span>Stablecoin</span>
        <select value={token} onChange={(e) => setToken(e.target.value as Address)}>
          {tokens.map((t) => (
            <option key={t.address} value={t.address}>
              {t.symbol}
            </option>
          ))}
        </select>
      </label>

      {hasVault && existing ? (
        <p className="ok">
          Vault:{" "}
          <a href={`${explorerFor(chainId)}/address/${existing}`} target="_blank" rel="noreferrer" className="mono">
            {existing}
          </a>
        </p>
      ) : (
        <button
          className="btn"
          disabled={!factory || !token || isPending}
          onClick={() => factory && token && createVault(factory, token)}
        >
          {isPending ? "Creating…" : "Create Vault"}
        </button>
      )}

      {error && <p className="err">{error.message}</p>}
    </div>
  );
}
