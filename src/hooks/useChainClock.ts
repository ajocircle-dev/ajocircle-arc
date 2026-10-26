import { useEffect, useState } from 'react'
import { useBlock } from 'wagmi'
import { CHAIN_ID } from '@/lib/contract'

/**
 * Current time in ms, aligned to the chain's clock (deadlines are enforced against block.timestamp)
 * and ticking every second.
 */
export function useChainNow(): number {
  const { data: block, dataUpdatedAt } = useBlock({ chainId: CHAIN_ID, query: { refetchInterval: 8000 } })
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const offset = block ? Number(block.timestamp) * 1000 - dataUpdatedAt : 0
  return now + offset
}
