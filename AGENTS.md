# AjoCircle

> Built with Arc Studio - money-powered apps in minutes

Project memory for future agents or humans.

## What This App Does

Onchain ajo/esusu rotating savings circles on Arc Testnet in USDC. Members contribute a fixed amount each round and one member receives the pot per round. Optional collateral (one contribution) is slashed when a member misses a round. Includes a create form, shareable join link, per-circle page (members, round, pot, paid status, next recipient, deadline countdown, contribute and settle with approve step), a dashboard table of all circles, and an activity history built from contract events.

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS (CSS-variable theme, light/dark via `data-theme`)
- Web3: wagmi v2, viem v2, ConnectKit (injected wallets only)
- Contracts: Solidity 0.8.28 + Foundry. `contracts/AjoCircle.sol`, tests in `contracts/test/*.t.sol` (47 passing). `bun run contracts:build`, `bun run contracts:test`.
- Chain: Arc Testnet (5042002). Token: USDC `0x3600000000000000000000000000000000000000` (6 decimals ERC-20 view).
- Routing: hash router in `src/lib/route.ts` (`#/`, `#/create`, `#/circle/:id`, `#/activity`).

## Deployed contracts

- AjoCircle (Arc Testnet): `0x1c1edf33342ea80f8a142193cbea4ace60201d48`, deployed at block 69209242, constructor arg = USDC address.
- Address and deploy block live in `.env` as `VITE_AJO_CIRCLE_ADDRESS` and `VITE_AJO_DEPLOY_BLOCK` (restart the dev server after changing).
- Typed ABI is `src/lib/ajoAbi.ts`, generated from `contracts/out/AjoCircle.sol/AjoCircle.json`. Regenerate after any contract change.

## Design decisions

- Status enum: Open, Drawing, Active, Completed, Cancelled. Random order uses a two step draw: `start` commits to a future block, anyone calls `finalizeDraw`.
- Payouts use try-transfer with a `pendingWithdrawal` fallback so one blocked recipient cannot brick a circle.
- Contributions are rejected after the round deadline; `settleRound` is open to anyone.
- Known accepted tradeoffs (from the requested spec): one-contribution collateral does not secure all future rounds; blockhash draw is not a verifiable randomness oracle.
- Activity history scans events from `VITE_AJO_DEPLOY_BLOCK` in bounded ranges, never from genesis.

## Key Files

- `src/App.tsx` - composition root
- `src/components/` - Dashboard, CreateCircle, CirclePage, CircleActions, MemberList, ActivityFeed, TxAction, NetworkBanner, Header, ShareCard
- `src/hooks/` - useCircles, useTx, useUsdc, useActivity, useChainClock, useTheme, useNetworkStatus
- `src/lib/` - contract constants, formatting, error parsing, share link helper, router

## To Run

```bash
bun install
bun run dev
```
