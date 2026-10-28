import { arc, arcTestnet } from 'viem/chains'
import { getUsdc, requireChain } from '@/onchain-facts'
import { usdcDecimalsFor } from '@/onchain-money'
import { ajoCircleAbi } from './ajoAbi'

/** Production defaults to Arc mainnet. Set VITE_AJO_NETWORK=testnet for the demo preview. */
const network = String(import.meta.env.VITE_AJO_NETWORK ?? 'mainnet').toLowerCase()
export const IS_TESTNET = network === 'testnet'
export const CHAIN_ID = IS_TESTNET ? arcTestnet.id : arc.id
export const CHAIN = requireChain(CHAIN_ID)

const usdcFact = getUsdc(CHAIN_ID)
if (!usdcFact) throw new Error(`USDC is not available on chain ${CHAIN_ID}`)

export const USDC_ADDRESS = usdcFact.address as `0x${string}`
export const USDC_DECIMALS = usdcDecimalsFor(CHAIN_ID)

export const AJO_ADDRESS = import.meta.env.VITE_AJO_CIRCLE_ADDRESS as `0x${string}`
export const AJO_DEPLOY_BLOCK = BigInt(String(import.meta.env.VITE_AJO_DEPLOY_BLOCK ?? '0'))

export const ajoContract = { address: AJO_ADDRESS, abi: ajoCircleAbi } as const

export const Status = {
  Open: 0,
  Drawing: 1,
  Active: 2,
  Completed: 3,
  Cancelled: 4,
} as const

export const STATUS_LABEL: Record<number, string> = {
  [Status.Open]: 'Open',
  [Status.Drawing]: 'Drawing order',
  [Status.Active]: 'Active',
  [Status.Completed]: 'Completed',
  [Status.Cancelled]: 'Cancelled',
}

export interface Circle {
  id: bigint
  creator: `0x${string}`
  name: string
  contributionAmount: bigint
  maxMembers: bigint
  roundDuration: bigint
  randomOrder: boolean
  collateralRequired: boolean
  status: number
  memberCount: bigint
  currentRound: bigint
  roundStart: bigint
  roundDeadline: bigint
  paidCount: bigint
  startedAt: bigint
  seedBlock: bigint
}
