import { ArrowLeft, ExternalLink, ShieldAlert } from 'lucide-react'
import { useAccount } from 'wagmi'
import { useCircle } from '@/hooks/useCircles'
import { useChainNow } from '@/hooks/useChainClock'
import { AJO_ADDRESS, CHAIN_ID, Status, STATUS_LABEL } from '@/lib/contract'
import { formatDuration, formatRoundDuration, shortAddress, usd } from '@/lib/format'
import { navigate } from '@/lib/route'
import { buildAddressExplorerUrl } from '@/onchain-facts'
import { ActivityFeed } from './ActivityFeed'
import { CircleActions } from './CircleActions'
import { statusTone } from './Dashboard'
import { MemberList } from './MemberList'
import { ShareCard } from './ShareCard'
import { Badge, Button, Card, Skeleton, Stat } from './ui'

export function CirclePage({ id }: { id: bigint }) {
  const { address } = useAccount()
  const { circle, memberStates, payoutOrder, recipient, me, pending, isLoading, notFound } = useCircle(id)
  const nowSec = Math.floor(useChainNow() / 1000)

  const back = (
    <button
      type="button"
      onClick={() => navigate('/')}
      className="mb-4 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-ink-2 hover:text-ink"
    >
      <ArrowLeft size={16} aria-hidden /> All circles
    </button>
  )

  if (notFound) {
    return (
      <div>
        {back}
        <Card className="grid place-items-center gap-3 py-14 text-center">
          <ShieldAlert size={28} className="text-subtle" aria-hidden />
          <p className="font-semibold">Circle #{id.toString()} does not exist</p>
          <p className="text-sm text-subtle">Check the link, or pick a circle from the list.</p>
          <Button onClick={() => navigate('/')}>Browse circles</Button>
        </Card>
      </div>
    )
  }

  if (isLoading || !circle) {
    return (
      <div className="space-y-4">
        {back}
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  const active = circle.status === Status.Active
  const potNow = circle.paidCount * circle.contributionAmount
  const potFull = circle.memberCount * circle.contributionAmount
  const left = Number(circle.roundDeadline) - nowSec
  const isRecipientMe = !!address && !!recipient && recipient.toLowerCase() === address.toLowerCase()
  const seatsLeft = Number(circle.maxMembers - circle.memberCount)

  return (
    <div className="space-y-5">
      {back}

      <Card className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={statusTone(circle.status)}>{STATUS_LABEL[circle.status]}</Badge>
              <span className="mono text-xs text-subtle">Circle #{circle.id.toString()}</span>
            </div>
            <h1 className="display mt-2 break-words text-3xl font-bold text-balance">{circle.name}</h1>
            <p className="mt-1 text-sm text-subtle">
              {usd(circle.contributionAmount)} USDC each, every {formatRoundDuration(Number(circle.roundDuration))}.{' '}
              {circle.randomOrder ? 'Random order' : 'Join order'}, {circle.collateralRequired ? 'collateral required' : 'no collateral'}.
            </p>
          </div>
          <a
            href={buildAddressExplorerUrl(CHAIN_ID, AJO_ADDRESS)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
          >
            Contract <ExternalLink size={12} aria-hidden />
          </a>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            label={active ? 'Pot this round' : 'Full pot'}
            value={`${usd(active ? potNow : potFull)}`}
            hint={active ? `of ${usd(potFull)} USDC` : 'USDC per round'}
            tone="accent"
          />
          <Stat
            label="Round"
            value={
              active
                ? `${Number(circle.currentRound) + 1} / ${circle.maxMembers.toString()}`
                : circle.status === Status.Completed
                  ? `${circle.maxMembers.toString()} / ${circle.maxMembers.toString()}`
                  : `0 / ${circle.maxMembers.toString()}`
            }
            hint={active ? `${circle.paidCount.toString()} of ${circle.memberCount.toString()} paid` : undefined}
          />
          <Stat
            label="Next recipient"
            value={
              active && recipient ? (
                <span className="mono text-base sm:text-lg">{isRecipientMe ? 'You' : shortAddress(recipient)}</span>
              ) : (
                <span className="text-subtle">-</span>
              )
            }
            hint={circle.status === Status.Open ? 'Set when the circle starts' : undefined}
          />
          <Stat
            label="Deadline"
            value={
              active ? (
                <span className={left <= 0 ? 'text-danger' : undefined}>{left > 0 ? formatDuration(left) : 'Passed'}</span>
              ) : (
                <span className="text-subtle">-</span>
              )
            }
            hint={active ? (left > 0 ? 'until round closes' : 'settle to continue') : undefined}
          />
        </div>

        {active && (
          <div aria-label="Payments this round">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-500"
                style={{ width: `${(Number(circle.paidCount) / Math.max(1, Number(circle.memberCount))) * 100}%` }}
              />
            </div>
          </div>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        <div className="space-y-5">
          <MemberList circle={circle} members={memberStates} payoutOrder={payoutOrder} recipient={recipient} />
          <ActivityFeed circleId={circle.id} title="Circle history" limit={40} />
        </div>
        <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <CircleActions circle={circle} me={me} recipient={recipient} pending={pending} nowSec={nowSec} />
          {circle.status === Status.Open && <ShareCard circleId={circle.id} seatsLeft={seatsLeft} />}
        </div>
      </div>
    </div>
  )
}
