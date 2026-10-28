# Arc Mainnet deployment (chain 5042)

- **Contract:** AjoCircle [`0xf4636a65d2a77b1df0c200e98ae8ddc2a8d2528b`](https://explorer.arc.io/address/0xf4636a65d2a77b1df0c200e98ae8ddc2a8d2528b)
- **Deploy block:** 28242792
- **Compiler:** solc 0.8.28, optimizer 200 runs, evm `cancun` (same source/settings as the Arc testnet deploy)
- **Constructor:** `usdc = 0x3600000000000000000000000000000000000000` (USDC; 6 decimals ERC-20, also the native gas token at 18 decimals)
- **RPC:** https://rpc.mainnet.arc.io · **Explorer:** https://explorer.arc.io
- **App:** https://ajocircle-arc.pages.dev
- **Deployer:** `0x61C24Be7f8c336909AD50F2d5160Ce4863f0c83F` (keystore `arc-mainnet-deployer`)
- **Deployed:** 2026-10-28 ~04:36 WAT. User-approved Option 1; hard cap 2 USDC total. No other mainnet txs.

Bytecode matches the Arc testnet contract (`0x1c1edf33…1d48`) byte-for-byte aside from the immutable USDC slots.

## Spend

| | Amount |
|---|---|
| Balance before | 0.580000 USDC |
| Balance after | 0.519805 USDC |
| **Total spent** | **0.060195 USDC** (gas ≈ 0.050195 + 0.01 collateral) |
| Cap | 2 USDC (abort line used: 0.5 USDC) |

Gas used: deploy 2,092,452 · approve 55,414 · createCircle 354,418.

## Transactions

| Step | Tx | Block |
|---|---|---|
| Deploy | [`0x348899f9…c30c33`](https://explorer.arc.io/tx/0x348899f97d7ac48c8b3b6dcfc91af5138eff52c057011029d99f5173cec30c33) | 28242792 |
| Approve 0.01 USDC | [`0x18076014…de956a`](https://explorer.arc.io/tx/0x180760149f4dec70db1db252ac755afb81d733f91336fec3117aef169dde956a) | 28242814 |
| createCircle | [`0x81a11cf5…d6ce9f`](https://explorer.arc.io/tx/0x81a11cf5b8591cf26bf19597a37f800e26f82158f823ceb44a47ce75fdd6ce9f) | 28242819 |

## Circle 1: Lagos Mainnet Ajo

| Field | Value |
|---|---|
| Id | 1 |
| Name | Lagos Mainnet Ajo |
| Contribution | 0.01 USDC (10000 units) |
| Max members | 2 |
| Round length | 1 day (86400 s) |
| Random order | false |
| Collateral | true (0.01 USDC escrowed on create) |
| Status | **Open** (1 of 2 seats; creator auto-joined) |
| Creator | 0x61C24Be7f8c336909AD50F2d5160Ce4863f0c83F |

Contract holds 0.01 USDC (the creator's collateral). Nothing else was sent.

## Source verification

`forge verify-contract … --verifier blockscout --verifier-url https://explorer.arc.io/api/` failed: Cloudflare challenge on the explorer API (`Just a moment…`). Use the web form at https://explorer.arc.io/contract-verification with solc 0.8.28, optimizer 200, cancun, and constructor arg `0x3600000000000000000000000000000000000000`.
