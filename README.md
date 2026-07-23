# KaneAI — Console (`kane-fe`)

A thin **React + Vite** console for KaneAI on **Celo**: connect a wallet, create a
non-custodial vault, and read its on-chain policy. Every write transaction carries
KaneAI's attribution tag.

> **The model advises; the chain decides.**

## Stack

React 19 · Vite · TypeScript · wagmi + viem · @tanstack/react-query · @celo/attribution-tags.
Deliberately thin and modular — core logic lives in `kane-be`, and this UI is easy to replace wholesale.

## Structure

| Path | Role |
| --- | --- |
| `src/config/chains.ts` | Celo mainnet + Sepolia chain defs. |
| `src/config/wagmi.ts` | wagmi config (injected connector). |
| `src/config/contracts.ts` | Factory addresses + known stablecoins per chain. |
| `src/config/attribution.ts` | ERC-8021 tag → `dataSuffix` for every write. |
| `src/abi/*` | Vault / factory ABIs (mirror `kane-be`). |
| `src/hooks/*` | `useCreateVault`, `useVault*` (read policy/balance). |
| `src/components/*` | `ConnectWallet`, `CreateVault`, `PolicyCard`. |

## Run

```bash
bun install
cp .env.example .env   # set VITE_FACTORY_CELO / VITE_FACTORY_SEPOLIA after deploy
bun run dev            # http://localhost:5173
```

The attribution tag defaults to KaneAI's registered value; factory addresses come
from `.env` once the contracts are deployed.

---

Part of **KaneAI** · Celo Agentic Payments & DeFAI Hackathon · MIT.
