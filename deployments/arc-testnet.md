# Arc Testnet deployment (chain 5042002)

- **Contract:** AjoCircle [`0x1c1edf33342ea80f8a142193cbea4ace60201d48`](https://explorer.testnet.arc.io/address/0x1c1edf33342ea80f8a142193cbea4ace60201d48)
- **Deploy block:** 69209242
- **Compiler:** solc 0.8.28, optimizer 200 runs, evm `cancun`
- **Constructor:** `usdc = 0x3600000000000000000000000000000000000000` (USDC, 6 decimals; also the native gas token, 18 decimals natively)
- **RPC:** https://rpc.testnet.arc.io · **Explorer:** https://explorer.testnet.arc.io
- **App (preview):** https://testnet.ajocircle-arc.pages.dev (production https://ajocircle-arc.pages.dev is now mainnet)
- **Seeded:** 2026-10-26, ~17:38–17:43 WAT. Wallets were funded from faucet.circle.com (20 testnet USDC each; demo-2 received 40).

## Wallets (public addresses only)

| Role | Address |
|---|---|
| deployer | 0x7E084Cb20EBe4a3ca1353EF24c96D048AAB50146 |
| demo-1 | 0x010F69291D5D4B1f4759A2268d6d6594D207B5B8 |
| demo-2 | 0x6c3c54F1234DCa73f4279fc0B021090E29828915 |
| demo-3 | 0xd02a4AaA0E3E4465b87E854458985Bbd000609ba |

## Demo circles

| Id | Name | Contribution | Seats | Round length | Order | Collateral | State |
|---|---|---|---|---|---|---|---|
| 1 | Balogun Market Ajo | 2 USDC | 2/4 | 1 day | join order | yes | **Open**, 2 seats left |
| 2 | Oshodi Traders Esusu | 2 USDC | 3/3 | 1 day | join order | yes | **Active**, round 2 of 3; round 1 paid out 6 USDC to the deployer; in round 2 the deployer and demo-1 have paid and demo-3 has not. Deadline Tue Oct 27 17:40 WAT |
| 3 | Onitsha Main Market Ajo | 1 USDC | 3/3 | 60 s | join order | yes | **Completed**: demo-3 missed round 1 and was slashed 1 USDC (defaulter flagged); all 3 rounds paid out; leftover collateral refunded |
| 4 | Ariaria Market Circle | 2 USDC | 3/3 | 1 day | random (seed block 69211842) | yes | **Active**, round 1 of 3, no payments yet. Payout order: demo-3, demo-2, deployer. Deadline Tue Oct 27 17:41 WAT |

Nothing settles a round automatically. After the 1-day deadlines, anyone may call `settleRound`, which slashes the members who haven't paid.

### Circle 1: Balogun Market Ajo
| Step | Wallet | Tx |
|---|---|---|
| approve demo-1 | demo-1 | [0x9cb8b2e6…b71a66](https://explorer.testnet.arc.io/tx/0x9cb8b2e6f329246a6225617e2122d5fad862c8f7f2491df69d8ec08e9fb71a66) |
| createCircle (demo-1) | demo-1 | [0x6537ae40…0e3477](https://explorer.testnet.arc.io/tx/0x6537ae40488e51eae235a63f3d1d68c887cebde15192389ebd11ccfcde0e3477) |
| approve demo-2 | demo-2 | [0xcffbc130…7ce354](https://explorer.testnet.arc.io/tx/0xcffbc130e2a818eaeb9f956fe50ce60b9265937bc96c7e19911a84021d7ce354) |
| join demo-2 | demo-2 | [0xfdaf691f…6fbc0e](https://explorer.testnet.arc.io/tx/0xfdaf691f8e2edb352c7861a309c174253db9ab035cfc837ac4510e46256fbc0e) |

### Circle 2: Oshodi Traders Esusu
| Step | Wallet | Tx |
|---|---|---|
| approve deployer | deployer | [0xbe802745…64ca1a](https://explorer.testnet.arc.io/tx/0xbe802745eb5da2eb62edc9cad7c417df50733e68f785229eedaac1385264ca1a) |
| createCircle (deployer) | deployer | [0x25d29d7b…2583b2](https://explorer.testnet.arc.io/tx/0x25d29d7b3f4669516d0ecf9ea8b7c87e739add0dae035391e07f2a183f2583b2) |
| approve demo-1 | demo-1 | [0xf53707b5…1ca026](https://explorer.testnet.arc.io/tx/0xf53707b587bc7e7c3b2d33284a451fc86bdcb711acebe6d823cda5ef051ca026) |
| join demo-1 | demo-1 | [0x4a0a0db9…eaeabd](https://explorer.testnet.arc.io/tx/0x4a0a0db9dd937833f4e4ce430db3eb7e4a0750ecf412ae72ba1c27ee10eaeabd) |
| approve demo-3 | demo-3 | [0x9bfa76cd…3d1966](https://explorer.testnet.arc.io/tx/0x9bfa76cdc0dd6c7d6fe6ab5df65ee7aff8049709cea63463d2953875da3d1966) |
| join demo-3 | demo-3 | [0xa6b48a61…db5fa7](https://explorer.testnet.arc.io/tx/0xa6b48a6110f7518a8ed1bd2a6cdc54561ce808c8f7edcde79b555208d2db5fa7) |
| start | deployer | [0xf4236c87…a338bc](https://explorer.testnet.arc.io/tx/0xf4236c87f882eda64e34d3756563609ae27d7b4cccd747d60ad4f78ed3a338bc) |
| R1 approve mezo-testnet-deployer | deployer | [0x9f3d4074…466f72](https://explorer.testnet.arc.io/tx/0x9f3d40742f3202b9dac0afee7c3084eae3df6960a77ac86d2b208fed38466f72) |
| R1 contribute mezo-testnet-deployer | deployer | [0x146f3ed6…39e433](https://explorer.testnet.arc.io/tx/0x146f3ed60bbe4471076ebe3886c729c6337fba50eeb8d13eb8ceb6571639e433) |
| R1 approve mezo-demo-1 | demo-1 | [0x02349b76…c631ce](https://explorer.testnet.arc.io/tx/0x02349b76ab0ece75b2f6115e432aed6ea5ef0c244e56e8356afeeec4e6c631ce) |
| R1 contribute mezo-demo-1 | demo-1 | [0xbeade591…b7686d](https://explorer.testnet.arc.io/tx/0xbeade591ea19a2d8ae1506cd7b7cafcb58cbd86dadc3b791cc9d6bd468b7686d) |
| R1 approve mezo-demo-3 | demo-3 | [0x6f1cb3c1…1dc023](https://explorer.testnet.arc.io/tx/0x6f1cb3c125bc80d102042b8c2308d15097101ca79b1c7a0dcbfe0ea2871dc023) |
| R1 contribute mezo-demo-3 | demo-3 | [0x14ad8fc1…77de33](https://explorer.testnet.arc.io/tx/0x14ad8fc149017657ed859b4e6441cca2b975cff81e52270bafad14bdfa77de33) |
| R1 settleRound (payout) | deployer | [0x16f1fc33…ccd7df](https://explorer.testnet.arc.io/tx/0x16f1fc3352976ec6d4879c9b384462a0d59e1eb565cea7a60b907809aaccd7df) |
| R2 approve mezo-testnet-deployer | deployer | [0x6d21e1d3…922675](https://explorer.testnet.arc.io/tx/0x6d21e1d33f0333fe018ef6724b8bd8de40f8f21ae96f2c274b491e099e922675) |
| R2 contribute mezo-testnet-deployer | deployer | [0x8ec23f94…82a247](https://explorer.testnet.arc.io/tx/0x8ec23f948273e92f41736cc7404ee4f05ecc194d6ef40b8a0bf5a6a8c182a247) |
| R2 approve mezo-demo-1 | demo-1 | [0x095ef5b9…b331c1](https://explorer.testnet.arc.io/tx/0x095ef5b9b825df6fd582fdb31603b5b7d303295a96b50d9e5900df7ccfb331c1) |
| R2 contribute mezo-demo-1 | demo-1 | [0x69c2dd76…5ec4c0](https://explorer.testnet.arc.io/tx/0x69c2dd76ee7c1f303c2406ea950d3c07eea7fce7cc4cd4f7e25d2cc1645ec4c0) |

### Circle 3: Onitsha Main Market Ajo
| Step | Wallet | Tx |
|---|---|---|
| approve demo-2 | demo-2 | [0x25304eda…5d516a](https://explorer.testnet.arc.io/tx/0x25304edadbdffaecd0498356c5e02466977e899c6e1cfec257d34db3da5d516a) |
| createCircle (demo-2) | demo-2 | [0xdefc099c…961a5e](https://explorer.testnet.arc.io/tx/0xdefc099c30fd151ea3635dc12abbe8d40c5bd560a443f44cdc4f3e6646961a5e) |
| approve demo-1 | demo-1 | [0x3b5bcb47…36a18c](https://explorer.testnet.arc.io/tx/0x3b5bcb47b10cb3fc99fffe982498ea2f16e2745a07244a21cfd9c8682c36a18c) |
| join demo-1 | demo-1 | [0xbaa9ff6c…36627b](https://explorer.testnet.arc.io/tx/0xbaa9ff6ce6256ff62010ce5a0c0776903992e1c475a8c4654d5060242836627b) |
| approve demo-3 | demo-3 | [0x0a2ce31f…f103a8](https://explorer.testnet.arc.io/tx/0x0a2ce31fd56f6990f7bb6b09c1184b72867d1d6200374d1dffbddc2b53f103a8) |
| join demo-3 | demo-3 | [0x3fa6f172…b4a5b7](https://explorer.testnet.arc.io/tx/0x3fa6f172b6c065d67188792261029b1fc5abd36c6126413842757f8536b4a5b7) |
| start | demo-2 | [0x52d7fb3e…0a71b5](https://explorer.testnet.arc.io/tx/0x52d7fb3ef71ebd66c366737a442b03a83893b8773cd83535f586a004130a71b5) |
| R1 approve mezo-demo-2 | demo-2 | [0xf928eb02…649145](https://explorer.testnet.arc.io/tx/0xf928eb02808ae5301727dc996aa26ff677119a5edf19f23043eff1ba11649145) |
| R1 contribute mezo-demo-2 | demo-2 | [0x8908181b…7d1c2c](https://explorer.testnet.arc.io/tx/0x8908181bee49c42d96ffb16480d14ab0a15465e42c3db4538c757624097d1c2c) |
| R1 approve mezo-demo-1 | demo-1 | [0x4fc83919…31c783](https://explorer.testnet.arc.io/tx/0x4fc8391976cbe57b3e5e859c06fa943a256d75f6974543955659e96fda31c783) |
| R1 contribute mezo-demo-1 | demo-1 | [0x5a639c29…5f10df](https://explorer.testnet.arc.io/tx/0x5a639c296af87e714e82f4a1fb4c436e8960e6e40565c0fbcf035410ca5f10df) |
| R1 settleRound (slash demo-3) | demo-2 | [0x9ea9dbfb…8cd926](https://explorer.testnet.arc.io/tx/0x9ea9dbfb04895da0ab7240a92bca1243f2ad125f19d36998732843b2b08cd926) |
| R2 approve mezo-demo-2 | demo-2 | [0x810b2c53…9f3dc1](https://explorer.testnet.arc.io/tx/0x810b2c53af47b7a10523c7490237045adbaae704317d701911746c64449f3dc1) |
| R2 contribute mezo-demo-2 | demo-2 | [0xc3f2f5a5…1f2dce](https://explorer.testnet.arc.io/tx/0xc3f2f5a565b9661633a8b9d26774aa5b389d1957c3be9aec40e3ecb5171f2dce) |
| R2 approve mezo-demo-1 | demo-1 | [0x32b9c8c3…504bd4](https://explorer.testnet.arc.io/tx/0x32b9c8c34d3dd0a0bd35c761c0ac81f8ebd9764e91c574fd1782d31a40504bd4) |
| R2 contribute mezo-demo-1 | demo-1 | [0x58a50481…cbf81c](https://explorer.testnet.arc.io/tx/0x58a50481900e6bffc722f8f5a002b26ce494adc4d5fb52e2e6c821834acbf81c) |
| R2 approve mezo-demo-3 | demo-3 | [0x6209dd50…c137fc](https://explorer.testnet.arc.io/tx/0x6209dd505b9347513f3bf7bb244b3323d71d4f5793dd0df543dd49aea7c137fc) |
| R2 contribute mezo-demo-3 | demo-3 | [0x63187035…554224](https://explorer.testnet.arc.io/tx/0x63187035af6a98d9721e7d49c5fb76ef737792279454d125e95ca4398f554224) |
| R2 settleRound | demo-2 | [0x6e82268f…49502c](https://explorer.testnet.arc.io/tx/0x6e82268fec260d37cc6e354aa86e327b3dadc0ca0b377ed3e028eeb5d249502c) |
| R3 approve mezo-demo-2 | demo-2 | [0xe71820a2…2a5256](https://explorer.testnet.arc.io/tx/0xe71820a27fd19a6fa6e4ea152b6fffd40695a867e4ecbbcefb694146e52a5256) |
| R3 contribute mezo-demo-2 | demo-2 | [0x835761e9…c14d45](https://explorer.testnet.arc.io/tx/0x835761e96f3242930f879430f0c81c441f1cc9c7641f2ed5669c4b61d2c14d45) |
| R3 approve mezo-demo-1 | demo-1 | [0x3c6e3be2…97039a](https://explorer.testnet.arc.io/tx/0x3c6e3be289d5561aeda29ca67a55b1063871e40ff0343572d95921737d97039a) |
| R3 contribute mezo-demo-1 | demo-1 | [0xb3c5c642…eedc4a](https://explorer.testnet.arc.io/tx/0xb3c5c642a1da4df4970842e7bfe860d6f7846ae90b4f883c56206b31f1eedc4a) |
| R3 approve mezo-demo-3 | demo-3 | [0xde7e6a24…a620f7](https://explorer.testnet.arc.io/tx/0xde7e6a24f11318a8ec50ad1dcae6f8854282f92393cc1bd0478ee0cffaa620f7) |
| R3 contribute mezo-demo-3 | demo-3 | [0x73263ed3…617028](https://explorer.testnet.arc.io/tx/0x73263ed3952565f3607f64b3db8e377abf818d05d2aaba4dc82f2eb3a5617028) |
| R3 settleRound (complete, refunds) | demo-2 | [0x8635685e…46d891](https://explorer.testnet.arc.io/tx/0x8635685e6d043955196b4c93ae6fb0e2dfd8ae5651aa80e803aee41fcb46d891) |

### Circle 4: Ariaria Market Circle
| Step | Wallet | Tx |
|---|---|---|
| approve demo-3 | demo-3 | [0x39232c97…1fff34](https://explorer.testnet.arc.io/tx/0x39232c9779c02a1ecf97be7e453256b6331655f972eb6b9a738211adf01fff34) |
| createCircle (demo-3, random) | demo-3 | [0x4baecfc2…5160c0](https://explorer.testnet.arc.io/tx/0x4baecfc2d6de6d20ec7e2a8d416146265d569688d88e082e2a892e59225160c0) |
| approve deployer | deployer | [0x56a7e3ff…87c6e4](https://explorer.testnet.arc.io/tx/0x56a7e3ff77ca4c5b3c4e77cb095c473caee7d459010ef7c69ec4b6a61d87c6e4) |
| join deployer | deployer | [0x4155ae3a…cca93d](https://explorer.testnet.arc.io/tx/0x4155ae3a302676b798e10b5defedab6679fb3e05096e9ab2cb14e736c8cca93d) |
| approve demo-2 | demo-2 | [0x30edeac6…e9a64b](https://explorer.testnet.arc.io/tx/0x30edeac69f8f70a8119dbba4129b432c7a898a7d228c239399e8c346c8e9a64b) |
| join demo-2 | demo-2 | [0x5ddbf980…d6e1e6](https://explorer.testnet.arc.io/tx/0x5ddbf980ac845e343f8a1851c979e06cfc6250f268e187c68e1f264f84d6e1e6) |
| start (draw commit) | demo-3 | [0x9644582a…ec2641](https://explorer.testnet.arc.io/tx/0x9644582a5e7b2e643fccc9c08cbccc730bad2dc5dd24a5bf9a91e8c30cec2641) |
| finalizeDraw | demo-3 | [0xd24bbb0f…a658b3](https://explorer.testnet.arc.io/tx/0xd24bbb0f314397a9c667d9401bed7dba8e3c7620c45985e8dd9a818d92a658b3) |

## Source verification

On 2026-10-26 at ~17:44 WAT, the contract was submitted to Blockscout with `forge verify-contract … --verifier blockscout --verifier-url https://explorer.testnet.arc.io/api/` (solc 0.8.28, 200 runs, cancun, constructor arg USDC). The status was still "Pending in queue" when this file was written. The local build matches the on-chain runtime bytecode byte for byte, apart from the immutable `usdc` slots.
