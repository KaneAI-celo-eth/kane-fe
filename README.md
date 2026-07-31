# KaneAI — Frontend (`kane-fe`)

The landing page + console for KaneAI on **Celo**. Connect a wallet, register a
non-custodial executor in one signature, then chat with the agent — it proposes a
move, your on-chain policy decides, and you sign the execution yourself.

> **The model advises; your policy decides.**

Live: **https://kane-ai-celo.vercel.app**

## Stack

React 19 · Vite · TypeScript · Tailwind CSS · wagmi v3 + viem · react-router ·
TanStack Query. Browser x402 buyer (`@x402/fetch`) + attribution tags
(`@celo/attribution-tags`).

## Routes

| Path | Page | Role |
| --- | --- | --- |
| `/` | `pages/Landing.tsx` | Hero — "The Model Advises · Your Policy Decides". |
| `/app` | `pages/Console.tsx` | The console: a state machine `connect → register → chat`. |

## Structure

| Path | Role |
| --- | --- |
| `config/wagmi.ts`, `config/chains.ts` | wagmi config; Celo mainnet + Sepolia. |
| `config/contracts.ts` | Factory, USDC, USDm/EURm, Aave V3, Ubeswap addresses (Celopedia-sourced). |
| `config/agent.ts` | Agent gateway: `proposeIntent` (`/intent`), `buildExecute` (`/build`), `fetchGatewayInfo` (`/health`). |
| `config/x402.ts` | `makePayFetch` — the browser x402 buyer that pays 0.01 USDC per prompt. |
| `config/attribution.ts` | ERC-8021 attribution suffix appended to every tx. |
| `config/forbiddenSelectors.ts` | The `calls` selector denylist seeded into the executor at registration. |
| `components/ConnectWallet.tsx` | Wallet connect. |
| `components/AuthorizeAgent.tsx` | Register — one signature (`createExecutorWithPolicy`). |
| `components/AgentPanel.tsx` | The chat: prompt → proposal card + "your policy decides" verdict. |
| `components/ExecuteButton.tsx` | Owner-signed `approve` + `execute` (via `/build`), balance-gated. |
| `components/PolicyCard.tsx` | Renders the executor's on-chain policy. |
| `components/KaneMark.tsx` | The four-blade KaneAI logo. |
| `hooks/useExecutor.ts` | Resolve the caller's executor + read its on-chain policy. |
| `hooks/useCreateExecutor.ts` | The register flow. |
| `hooks/useChatSessions.ts` | Persistent multi-session chat (localStorage). |
| `abi/` | `kaneExecutor`, `kaneExecutorFactory`, `aave`, `ubeswap`. |

## How a prompt flows

1. **Ask** — `POST /intent` through the x402 buyer (0.01 USDC per prompt). The agent
   answers, or returns a proposed `supply` / `withdraw` / `swap`.
2. **Decide** — the proposal is dry-run against the on-chain policy; the card shows
   "Allowed ✓" or the reason it would revert.
3. **Execute** — `POST /build` returns the `execute()` payload; the owner signs
   `approve` + `execute` in their own wallet. Funds settle back to the owner, tagged.

## Run

```bash
bun install
bun run dev        # http://localhost:5173
bun run build      # tsc --noEmit && vite build
```

## Environment

| Var | Purpose |
| --- | --- |
| `VITE_AGENT_API` | Agent backend (kane-be) base URL. In production the app proxies it same-origin under `/api`. |
| `VITE_FACTORY_CELO` / `VITE_CELO_RPC` | Override the factory / RPC (e.g. an anvil fork) for local dev. |

---

Part of **KaneAI** · Celo Agentic Payments & DeFAI Hackathon · MIT.
