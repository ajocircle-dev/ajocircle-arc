import { useMemo } from 'react'
import { useAccount } from 'wagmi'
import { Check, Clock, Flag, Lock, Trophy } from 'lucide-react'
import type { MemberState } from '@/hooks/useCircles'
import { Status, type Circle } from '@/lib/contract'
import { shortAddress, usd } from '@/lib/format'
import { Badge, Card, SectionTitle } from './ui'

function Avatar({ address }: { address: string }) {
  const hue = parseInt(address.slice(2, 8), 16) % 360
  return (
    <span
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
      style={{ background: `hsl(${hue} 38% 38%)` }}
      aria-hidden
    >
      {address.slice(2, 4).toUpperCase()}
    </span>
  )
}

export function MemberList({
  circle,
  members,
  payoutOrder,
  recipient,
}: {
  circle: Circle
  members: MemberState[]
  payoutOrder: `0x${string}`[]
  recipient?: `0x${string}`
}) {
  const { address } = useAccount()
  const active = circle.status === Status.Active

  const rows = useMemo(() => {
    const byAddr = new Map(members.map((m) => [m.address.toLowerCase(), m]))
    if (payoutOrder.length) {
      return payoutOrder
        .map((a, i) => ({ m: byAddr.get(a.toLowerCase()), seat: i }))
        .filter((r): r is { m: MemberState; seat: number } => !!r.m)
    }
    return members.map((m, i) => ({ m, seat: i }))
  }, [members, payoutOrder])

  const ordered = payoutOrder.length > 0
  const emptySeats = Math.max(0, Number(circle.maxMembers) - members.length)

  return (
    <Card>
      <SectionTitle
        aside={
          <span className="text-xs font-semibold text-subtle tabular-nums">
            {members.length}/{circle.maxMembers.toString()} seats
          </span>
        }
      >
        {ordered ? 'Payout order' : 'Members'}
      </SectionTitle>
      <ul className="divide-y">
        {rows.map(({ m, seat }) => {
          const isMe = !!address && m.address.toLowerCase() === address.toLowerCase()
          const isCreator = m.address.toLowerCase() === circle.creator.toLowerCase()
          const isRecipient = active && recipient?.toLowerCase() === m.address.toLowerCase()
          const received = ordered && (circle.status === Status.Completed || (active && seat < Number(circle.currentRound)))
          return (
            <li key={m.address} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-3">
              <Avatar address={m.address} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mono text-sm font-medium">{shortAddress(m.address)}</span>
                  {isMe && <Badge tone="teal">You</Badge>}
                  {isCreator && <Badge>Creator</Badge>}
                  {m.defaulter && (
                    <Badge tone="red">
                      <Flag size={11} aria-hidden /> Defaulter
                    </Badge>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-subtle">
                  <span>{ordered ? `Round ${seat + 1}` : `Seat ${seat + 1}`}</span>
                  {circle.collateralRequired && (
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Lock size={11} aria-hidden /> {usd(m.collateral)} locked
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {isRecipient && (
                  <Badge tone="amber">
                    <Trophy size={11} aria-hidden /> Next payout
                  </Badge>
                )}
                {received && <Badge tone="green">Paid out</Badge>}
                {active &&
                  (m.paid ? (
                    <Badge tone="green">
                      <Check size={11} aria-hidden /> Paid
                    </Badge>
                  ) : (
                    <Badge tone="neutral">
                      <Clock size={11} aria-hidden /> Owes
                    </Badge>
                  ))}
              </div>
            </li>
          )
        })}
        {Array.from({ length: emptySeats }).map((_, i) => (
          <li key={`empty-${i}`} className="flex items-center gap-3 py-3 text-sm text-subtle">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-dashed" aria-hidden>
              +
            </span>
            Open seat
          </li>
        ))}
      </ul>
    </Card>
  )
}
