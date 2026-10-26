# AjoCircle

An onchain ajo/esusu rotating savings circle on Arc Testnet, funded in USDC. A group agrees on a fixed contribution, everyone pays each round, and one member takes the whole pot each round until everyone has had a turn. Optional collateral protects the group when someone misses a payment.

Built with [Arc Studio](https://studio.arc.io)

## What you can do

- Connect a browser wallet and create a circle: name, contribution, number of members, round length, payout order (join order or random draw), and whether collateral is required.
- Share a join link so friends can take a seat. Members can leave for a full refund until the circle starts.
- Run a circle: contribute each round (with a one-time USDC approval), settle rounds, and watch the pot, who has paid, the next recipient, and a live deadline countdown.
- Browse every circle in a dashboard and follow an activity history built from onchain events.
- Switch between light and dark mode. Clear messages appear when no wallet is installed or the wallet is on the wrong network.

## Tech stack

- React, Vite, TypeScript, Tailwind CSS
- wagmi, viem, ConnectKit
- Solidity 0.8.28 with Foundry and OpenZeppelin

## Development

Prerequisites: [Bun](https://bun.sh) and [Foundry](https://book.getfoundry.sh).

```bash
bun install
bun run dev
```

Build the contract and run its tests:

```bash
bun run contracts:build
bun run contracts:test
```

Other scripts: `bun run check` runs lint and the type check.

### Environment variables

- `VITE_AJO_CIRCLE_ADDRESS`: address of the deployed AjoCircle contract on Arc Testnet.
- `VITE_AJO_DEPLOY_BLOCK`: block the contract was deployed at, where the activity history starts reading.

Restart the dev server after changing either value.

## Notes on trust

- Collateral equals one contribution, so it only covers a single missed round. A member who collects an early payout and then stops paying can leave later recipients short.
- Random order is drawn from a future block hash after the circle is full. It cannot be previewed by the creator, but it is not a verifiable randomness service.
- This is a testnet build. Do not use it with real funds.
