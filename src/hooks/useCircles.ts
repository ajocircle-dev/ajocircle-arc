import { useMemo } from 'react'
import { useAccount, useReadContract, useReadContracts } from 'wagmi'
import { ajoContract, CHAIN_ID, type Circle } from '@/lib/contract'

const POLL = 10_000

/** All circles plus which ones the connected wallet belongs to. */
export function useCircles() {
  const { address } = useAccount()
  const countQuery = useReadContract({
    ...ajoContract,
    functionName: 'circleCount',
    chainId: CHAIN_ID,
    query: { refetchInterval: POLL },
  })
  const count = Number(countQuery.data ?? 0n)
  const ids = useMemo(() => Array.from({ length: count }, (_, i) => BigInt(count - i)), [count])

  const circlesQuery = useReadContracts({
    contracts: ids.map((id) => ({ ...ajoContract, functionName: 'getCircle' as const, args: [id] as const, chainId: CHAIN_ID })),
    query: { enabled: ids.length > 0, refetchInterval: POLL },
  })

  const membershipQuery = useReadContracts({
    contracts: address
      ? ids.map((id) => ({
          ...ajoContract,
          functionName: 'getMemberInfo' as const,
          args: [id, address] as const,
          chainId: CHAIN_ID,
        }))
      : [],
    query: { enabled: !!address && ids.length > 0, refetchInterval: POLL },
  })

  const circles = useMemo(() => {
    const out: Circle[] = []
    circlesQuery.data?.forEach((r) => {
      if (r.status === 'success') out.push(r.result)
    })
    return out
  }, [circlesQuery.data])

  const memberOf = useMemo(() => {
    const set = new Set<string>()
    membershipQuery.data?.forEach((r, i) => {
      if (r.status === 'success' && (r.result as readonly [boolean, ...unknown[]])[0]) set.add(ids[i].toString())
    })
    return set
  }, [membershipQuery.data, ids])

  return {
    circles,
    memberOf,
    count,
    isLoading: countQuery.isLoading || (ids.length > 0 && circlesQuery.isLoading),
    isError: countQuery.isError,
  }
}

export interface MemberState {
  address: `0x${string}`
  paid: boolean
  collateral: bigint
  defaulter: boolean
  defaults: bigint
  pending: bigint
}

/** One circle with its members, payout order, current recipient, and per-member state. */
export function useCircle(id: bigint) {
  const { address } = useAccount()
  const base = useReadContracts({
    contracts: [
      { ...ajoContract, functionName: 'getCircle', args: [id], chainId: CHAIN_ID },
      { ...ajoContract, functionName: 'getMembers', args: [id], chainId: CHAIN_ID },
      { ...ajoContract, functionName: 'getPayoutOrder', args: [id], chainId: CHAIN_ID },
      { ...ajoContract, functionName: 'currentRecipient', args: [id], chainId: CHAIN_ID },
    ],
    query: { refetchInterval: 6000 },
  })

  const circle = base.data?.[0].status === 'success' ? (base.data[0].result) : undefined
  const members = base.data?.[1].status === 'success' ? [...(base.data[1].result)] : []
  const payoutOrder = base.data?.[2].status === 'success' ? [...(base.data[2].result)] : []
  const recipient = base.data?.[3].status === 'success' ? (base.data[3].result) : undefined
  const notFound = base.data?.[0].status === 'failure'

  const memberKey = members.join(',')
  const memberQuery = useReadContracts({
    contracts: members.flatMap((m) => [
      { ...ajoContract, functionName: 'hasPaid' as const, args: [id, m] as const, chainId: CHAIN_ID },
      { ...ajoContract, functionName: 'getMemberInfo' as const, args: [id, m] as const, chainId: CHAIN_ID },
    ]),
    query: { enabled: members.length > 0, refetchInterval: 6000 },
  })

  const memberStates: MemberState[] = useMemo(() => {
    return members.map((m, i) => {
      const paid = memberQuery.data?.[i * 2]
      const info = memberQuery.data?.[i * 2 + 1]
      const infoTuple =
        info?.status === 'success' ? (info.result as readonly [boolean, bigint, boolean, bigint, bigint]) : undefined
      return {
        address: m,
        paid: paid?.status === 'success' ? (paid.result as boolean) : false,
        collateral: infoTuple?.[1] ?? 0n,
        defaulter: infoTuple?.[2] ?? false,
        defaults: infoTuple?.[3] ?? 0n,
        pending: infoTuple?.[4] ?? 0n,
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberKey, memberQuery.data])

  const me = address ? memberStates.find((m) => m.address.toLowerCase() === address.toLowerCase()) : undefined

  // Pending withdrawals can exist for someone who already left, so read it directly for the wallet.
  const pendingQuery = useReadContract({
    ...ajoContract,
    functionName: 'pendingWithdrawal',
    args: address ? [id, address] : undefined,
    chainId: CHAIN_ID,
    query: { enabled: !!address, refetchInterval: 8000 },
  })

  return {
    circle,
    members,
    memberStates,
    payoutOrder,
    recipient,
    me,
    isMember: !!me,
    pending: pendingQuery.data ?? 0n,
    isLoading: base.isLoading,
    notFound,
  }
}
