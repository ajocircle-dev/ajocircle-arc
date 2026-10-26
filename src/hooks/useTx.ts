import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Abi, Address, Hash, TransactionReceipt } from 'viem'
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from 'wagmi'
import { toast } from 'sonner'
import { CHAIN, CHAIN_ID } from '@/lib/contract'
import { parseTxError } from '@/lib/errors'
import { buildTxExplorerUrl } from '@/onchain-facts'

export type TxState = 'idle' | 'signing' | 'confirming' | 'success' | 'error'

export interface TxRequest {
  address: Address
  abi: Abi
  functionName: string
  args?: readonly unknown[]
}

/**
 * One wallet write: switch to Arc if needed, simulate (for readable revert reasons),
 * sign, then wait for the receipt. Every state shown comes from the wallet or the chain.
 */
export function useTx() {
  const { address, chainId } = useAccount()
  const publicClient = usePublicClient({ chainId: CHAIN_ID })
  const { writeContractAsync } = useWriteContract()
  const { switchChainAsync } = useSwitchChain()
  const queryClient = useQueryClient()
  const [state, setState] = useState<TxState>('idle')
  const [hash, setHash] = useState<Hash>()
  const [error, setError] = useState<string>()

  const run = useCallback(
    async (request: TxRequest, successMessage: string): Promise<TransactionReceipt | null> => {
      if (!address || !publicClient) return null
      setError(undefined)
      setHash(undefined)
      try {
        if (chainId !== CHAIN_ID) {
          setState('signing')
          await switchChainAsync({ chainId: CHAIN_ID })
        }
        setState('signing')
        const simulation = await publicClient.simulateContract({ account: address, ...request })
        const txHash = await writeContractAsync(simulation.request)
        setHash(txHash)
        setState('confirming')
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
        if (receipt.status !== 'success') throw new Error('Transaction reverted onchain.')
        setState('success')
        toast.success(successMessage, {
          action: {
            label: 'View',
            onClick: () => window.open(buildTxExplorerUrl(CHAIN.chainId, txHash), '_blank', 'noopener'),
          },
        })
        await queryClient.invalidateQueries()
        window.dispatchEvent(new Event('ajo:refresh'))
        return receipt
      } catch (e) {
        const message = parseTxError(e)
        if (message === null) {
          setState('idle')
        } else {
          setState('error')
          setError(message)
          toast.error(message)
        }
        return null
      }
    },
    [address, chainId, publicClient, queryClient, switchChainAsync, writeContractAsync],
  )

  const reset = useCallback(() => {
    setState('idle')
    setError(undefined)
    setHash(undefined)
  }, [])

  return { run, state, hash, error, reset, busy: state === 'signing' || state === 'confirming' }
}
