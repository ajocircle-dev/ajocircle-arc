import { erc20Abi } from 'viem'
import { useAccount, useReadContracts } from 'wagmi'
import { AJO_ADDRESS, CHAIN_ID, USDC_ADDRESS } from '@/lib/contract'

/** The connected wallet's USDC balance and its allowance to the AjoCircle contract (ERC-20 view, 6 decimals). */
export function useUsdc() {
  const { address } = useAccount()
  const { data, isLoading } = useReadContracts({
    allowFailure: false,
    contracts: address
      ? [
          { address: USDC_ADDRESS, abi: erc20Abi, functionName: 'balanceOf', args: [address], chainId: CHAIN_ID },
          {
            address: USDC_ADDRESS,
            abi: erc20Abi,
            functionName: 'allowance',
            args: [address, AJO_ADDRESS],
            chainId: CHAIN_ID,
          },
        ]
      : [],
    query: { enabled: !!address, refetchInterval: 8000 },
  })

  return {
    balance: data ? (data[0] as bigint) : undefined,
    allowance: data ? (data[1] as bigint) : undefined,
    isLoading,
  }
}
