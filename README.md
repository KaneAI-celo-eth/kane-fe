# KaneAI — Console (`kane-fe`)

A thin **React + Vite** console for KaneAI on **Celo**: connect a wallet, create your
non-custodial **executor**, and authorize a delegated agent — set its key, provision
per-token caps, allowlist the Aave V3 pool with recipient-bound selectors, and seed the
transfer/allowance denylist. Every write transaction carries KaneAI's attribution tag.

> **The model advises; the chain decides.**

## Model

Funds never leave the user's wallet. Each user deploys one **`KaneExecutor`** (per-user,
behind a shared beacon, created via `KaneExecutorFactory`). The owner authorizes a separate
**agent key**; the agent (in `kane-be`) drives an atomic `execute(pulls, approvals, calls,
version)` bounded by an on-chain policy: per-token caps, a recipient-bound allowlist, and a
seeded selector denylist. Raw transfers are forbidden and fund-moving recipients are bound to
the owner — so the demo agent action is an **Aave V3 USDC supply/withdraw rebalance**.

## Stack

React 19 · Vite · TypeScript · wagmi + viem · @tanstack/react-query · @celo/attribution-tags.
Deliberately thin and modular — core logic lives in `kane-be`, and this UI is easy to replace wholesale.

## Structure

| Path | Role |
| --- | --- |
| `src/config/chains.ts` | Celo mainnet + Sepolia chain defs. |
| `src/config/wagmi.ts` | wagmi config (injected connector). |
| `src/config/contracts.ts` | Factory address (env) + Aave V3 (pool/data-provider) + USDC per chain. |
| `src/config/forbiddenSelectors.ts` | `standardForbiddenSelectors()` — the seeded `calls` denylist. |
| `src/config/attribution.ts` | ERC-8021 tag → `dataSuffix` for every write. |
| `src/abi/kaneExecutor.ts` | `KaneExecutor` surface (status reads + owner config writes). |
| `src/abi/kaneExecutorFactory.ts` | `KaneExecutorFactory` (`createExecutor` / `executorOf`). |
| `src/abi/aave.ts` | Aave V3 pool + data-provider ABIs and supply/withdraw selectors. |
| `src/hooks/useCreateExecutor.ts` | `factory.createExecutor()` (attribution-tagged). |
| `src/hooks/useExecutor.ts` | Resolve executor + read owner/agent/version/revoked/MANAGER + per-token policy. |
| `src/components/*` | `ConnectWallet`, `AuthorizeAgent` (authorize stepper), `PolicyCard`. |

## Authorize flow

Owner-signed, each write attribution-tagged, in order:

1. `createExecutor()` — deploy your executor via the factory.
2. `setAgent(agentAddr)` — delegate a separate agent key.
3. `provisionToken(USDC, caps)` + `provisionToken(aUSDC, caps)` — per-token pull caps.
4. `setAllowedTarget(AAVE_POOL, true)` — allowlist the Aave V3 pool.
5. `setAllowedSelector(supply, allowed, bindRecipient=true, word=2)` and the same for `withdraw`
   — bind the recipient (`onBehalfOf` / `to`) to the owner.
6. `setForbiddenSelectors(standardForbiddenSelectors(), true)` — seed the transfer/allowance denylist.

> Only **static-head-recipient** selectors (Aave `supply`/`withdraw`) are allowlisted. Universal
> Router / V3 `exactInput` are deliberately **not** — binding cannot protect a recipient nested in
> dynamic calldata.

## Run

```bash
bun install
cp .env.example .env   # set VITE_FACTORY_CELO / VITE_FACTORY_SEPOLIA after deploy
bun run dev            # http://localhost:5173
```

The attribution tag defaults to KaneAI's registered value; factory addresses come
from `.env` once the contracts are deployed. The Aave demo action requires Celo Mainnet.

---

Part of **KaneAI** · Celo Agentic Payments & DeFAI Hackathon · MIT.
