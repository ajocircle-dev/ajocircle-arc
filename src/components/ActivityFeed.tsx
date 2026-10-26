import { useMemo } from 'react'
import { useAccount } from 'wagmi'
import {
  AlertTriangle,
  ArrowDownToLine,
  Ban,
  CircleCheck,
  Dices,
  Flag,
  HandCoins,
  LogIn,
  LogOut,
  Play,
  PlusCircle,
  Trophy,
  type LucideIcon,
} from 'lucide-react'
import { useActivity, useBlockTimes, type ActivityItem } from '@/hooks/useActivity'
import { useChainNow } from '@/hooks/useChainClock'
import { CHAIN_ID } from '@/lib/contract'
import { shortAddress, timeAgo, usd } from '@/lib/format'
import { circlePath } from '@/lib/route'
import { buildTxExplorerUrl } from '@/onchain-facts'
import { Card, SectionTitle, Skeleton } from './ui'

type Tone = 'text-primary' | 'text-accent' | 'text-success' | 'text-danger' | 'text-warn' | 'text-subtle'

interface Described {
  icon: LucideIcon
  tone: Tone
  text: string
}

function describe(item: ActivityItem, me?: string): Described {
  const a = item.args
  const who = (v: unknown) => {
    const addr = String(v)
    return me && addr.toLowerCase() === me.toLowerCase() ? 'You' : shortAddress(addr)
  }
  const round = (v: unknown) => `round ${Number(v) + 1}`
  switch (item.eventName) {
    case 'CircleCreated':
      return { icon: PlusCircle, tone: 'text-primary', text: `${who(a.creator)} created "${String(a.name)}" (${usd(a.contributionAmount as bigint)} USDC, ${String(a.maxMembers)} members)` }
    case 'MemberJoined':
      return { icon: LogIn, tone: 'text-primary', text: `${who(a.member)} joined` }
    case 'MemberLeft':
      return { icon: LogOut, tone: 'text-subtle', text: `${who(a.member)} left and got ${usd(a.refunded as bigint)} USDC back` }
    case 'CircleCancelled':
      return { icon: Ban, tone: 'text-danger', text: 'Circle cancelled, collateral refunded' }
    case 'CircleDrawStarted':
      return { icon: Dices, tone: 'text-warn', text: `Payout order draw committed to block ${String(a.seedBlock)}` }
    case 'CircleStarted':
      return { icon: Play, tone: 'text-accent', text: 'Circle started, payout order is set' }
    case 'Contributed':
      return { icon: HandCoins, tone: 'text-accent', text: `${who(a.member)} paid ${usd(a.amount as bigint)} USDC for ${round(a.round)}` }
    case 'CollateralSlashed':
      return { icon: AlertTriangle, tone: 'text-danger', text: `${who(a.member)} missed ${round(a.round)}, ${usd(a.slashed as bigint)} USDC of collateral slashed` }
    case 'DefaulterFlagged':
      return { icon: Flag, tone: 'text-danger', text: `${who(a.member)} was flagged as a defaulter` }
    case 'RoundSettled':
      return { icon: Trophy, tone: 'text-success', text: `${who(a.recipient)} received the ${round(a.round)} pot of ${usd(a.payoutAmount as bigint)} USDC` }
    case 'CollateralReturned':
      return { icon: ArrowDownToLine, tone: 'text-success', text: `${who(a.member)} got ${usd(a.amount as bigint)} USDC collateral back` }
    case 'CircleCompleted':
      return { icon: CircleCheck, tone: 'text-success', text: 'Circle completed' }
    case 'PayoutDeferred':
      return { icon: AlertTriangle, tone: 'text-warn', text: `${usd(a.amount as bigint)} USDC for ${who(a.to)} is waiting to be withdrawn` }
    case 'Withdrawn':
      return { icon: ArrowDownToLine, tone: 'text-success', text: `${who(a.member)} withdrew ${usd(a.amount as bigint)} USDC` }
    default:
      return { icon: CircleCheck, tone: 'text-subtle', text: item.eventName }
  }
}

export function ActivityFeed({ circleId, limit = 60, title = 'Activity' }: { circleId?: bigint; limit?: number; title?: string }) {
  const { items, progress } = useActivity()
  const { address } = useAccount()
  const now = useChainNow()

  const visible = useMemo(
    () => (circleId === undefined ? items : items.filter((i) => i.circleId === circleId)).slice(0, limit),
    [items, circleId, limit],
  )
  const times = useBlockTimes(useMemo(() => visible.map((v) => v.blockNumber), [visible]))
  const remaining = progress.head > progress.scanned ? progress.head - progress.scanned : 0n

  return (
    <Card>
      <SectionTitle
        aside={
          progress.syncing && (
            <span className="text-xs text-subtle tabular-nums">
              Syncing history, {remaining.toLocaleString()} blocks left
            </span>
          )
        }
      >
        {title}
      </SectionTitle>

      {visible.length === 0 ? (
        progress.syncing ? (
          <div className="space-y-2">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-subtle">No activity yet.</p>
        )
      ) : (
        <ul className="divide-y">
          {visible.map((item) => {
            const d = describe(item, address)
            const ts = times[item.blockNumber.toString()]
            return (
              <li key={item.key} className="flex items-start gap-3 py-3">
                <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted ${d.tone}`}>
                  <d.icon size={16} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-pretty">{d.text}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-subtle">
                    {circleId === undefined && (
                      <a className="font-semibold text-accent hover:underline" href={`#${circlePath(item.circleId)}`}>
                        Circle #{item.circleId.toString()}
                      </a>
                    )}
                    <span>{ts ? timeAgo(ts, now) : `block ${item.blockNumber.toString()}`}</span>
                    <a
                      className="hover:underline"
                      href={buildTxExplorerUrl(CHAIN_ID, item.txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View tx
                    </a>
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
