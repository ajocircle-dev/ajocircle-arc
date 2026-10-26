import { useAccount } from 'wagmi'
import { CHAIN_ID } from '@/lib/contract'

export type NetworkStatus = 'no-wallet' | 'disconnected' | 'wrong-network' | 'ready'

export function hasInjectedWallet(): boolean {
  return typeof window !== 'undefined' && 'ethereum' in window && !!(window as { ethereum?: unknown }).ethereum
}

export function useNetworkStatus(): NetworkStatus {
  const { isConnected, chainId } = useAccount()
  if (!isConnected) return hasInjectedWallet() ? 'disconnected' : 'no-wallet'
  if (chainId !== CHAIN_ID) return 'wrong-network'
  return 'ready'
}
