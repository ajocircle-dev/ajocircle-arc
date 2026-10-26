import { useMemo, useState } from 'react'
import { ArrowRight, Plus, Users } from 'lucide-react'
import clsx from 'clsx'
import { useCircles } from '@/hooks/useCircles'
import { useChainNow } from '@/hooks/useChainClock'
import { circlePath, navigate } from '@/lib/route'
import { Status, STATUS_LABEL, type Circle } from '@/lib/contract'
import { formatDuration, formatRoundDuration, usd } from '@/lib/format'
import { Badge, Button, Card, Skeleton, Stat } from './ui'

type Filter = 'all' | 'mine' | 'open'

export function statusTone(status: number): 'teal' | 'blue' | 'green' | 'amber' | 'neutral' {
  switch (status) {
    case Status.Open:
      return 'teal'
    case Status.Drawing:
      return 'amber'
    case Status.Active:
      return 'blue'
    case Status.Completed:
      return 'green'
    default:
      return 'neutral'
  }
}

function RoundCell({ c, nowSec }: { c: Circle; nowSec: number }) {
  if (c.status === Status.Active) {
    const left = Number(c.roundDeadline) - nowSec
    return (
      <span className="tabular-nums">
        {Number(c.currentRound) + 1}/{c.maxMembers.toString()}
        <span className="ml-1.5 text-xs text-subtle">{left > 0 ? formatDuration(left) : 'due'}</span>
      </span>
    )
  }
  if (c.status === Status.Completed) return <span className="tabular-nums">{c.maxMembers.toString()}/{c.maxMembers.toString()}</span>
  return <span className="text-subtle">{formatRoundDuration(Number(c.roundDuration))} rounds</span>
}

export function Dashboard() {
  const { circles, memberOf, isLoading, count } = useCircles()
  const nowSec = Math.floor(useChainNow() / 1000)
  const [filter, setFilter] = useState<Filter>('all')

  const stats = useMemo(
    () => ({
      open: circles.filter((c) => c.status === Status.Open).length,
      active: circles.filter((c) => c.status === Status.Active || c.status === Status.Drawing).length,
      mine: circles.filter((c) => memberOf.has(c.id.toString())).length,
    }),
    [circles, memberOf],
  )

  const rows = useMemo(
    () =>
      circles.filter((c) => {
        if (filter === 'mine') return memberOf.has(c.id.toString())
        if (filter === 'open') return c.status === Status.Open
        return true
      }),
    [circles, filter, memberOf],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="display text-3xl font-bold text-balance sm:text-4xl">Save together, take turns.</h1>
          <p className="mt-2 max-w-xl text-pretty text-ink-2">
            Everyone in a circle pays the same USDC each round, and one member takes home the whole pot. Collateral keeps
            it fair.
          </p>
        </div>
        <Button onClick={() => navigate('/create')} className="shrink-0">
          <Plus size={18} aria-hidden /> New circle
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Circles" value={count} />
        <Stat label="Open to join" value={stats.open} hint={`${stats.active} running`} />
        <Stat label="Yours" value={stats.mine} tone="accent" />
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="flex items-center gap-1 border-b p-3">
          {(['all', 'mine', 'open'] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={clsx(
                'min-h-10 rounded-lg px-3.5 text-sm font-semibold capitalize transition',
                filter === f ? 'bg-primary text-primary-ink' : 'text-ink-2 hover:bg-muted',
              )}
            >
              {f === 'mine' ? 'My circles' : f === 'open' ? 'Open' : 'All'}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : rows.length === 0 ? (
          <div className="grid place-items-center gap-3 px-6 py-14 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-primary">
              <Users size={22} aria-hidden />
            </div>
            <p className="font-semibold">
              {count === 0 ? 'No circles yet' : filter === 'mine' ? 'You have not joined a circle yet' : 'Nothing matches'}
            </p>
            <p className="max-w-sm text-sm text-subtle">
              {count === 0 ? 'Start the first one and share the join link with friends.' : 'Try another filter, or start your own circle.'}
            </p>
            <Button onClick={() => navigate('/create')}>Create a circle</Button>
          </div>
        ) : (
          <>
            <div className="hidden grid-cols-[2.2fr_1fr_1fr_1.3fr_1fr_auto] gap-4 border-b px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-subtle md:grid">
              <span>Circle</span>
              <span>Contribution</span>
              <span>Members</span>
              <span>Round</span>
              <span>Status</span>
              <span className="w-5" />
            </div>
            <ul className="divide-y">
              {rows.map((c) => {
                const mine = memberOf.has(c.id.toString())
                return (
                  <li key={c.id.toString()}>
                    <a
                      href={`#${circlePath(c.id)}`}
                      className="grid min-h-16 grid-cols-2 items-center gap-x-4 gap-y-2 px-4 py-3.5 transition hover:bg-muted md:grid-cols-[2.2fr_1fr_1fr_1.3fr_1fr_auto] md:px-5"
                    >
                      <div className="col-span-2 flex min-w-0 items-center gap-2 md:col-span-1">
                        <span className="mono text-xs text-subtle">#{c.id.toString()}</span>
                        <span className="truncate font-semibold">{c.name}</span>
                        {mine && <Badge tone="teal">You</Badge>}
                      </div>
                      <span className="display font-semibold tabular-nums text-accent">{usd(c.contributionAmount)} USDC</span>
                      <span className="tabular-nums md:text-left">
                        {c.memberCount.toString()}/{c.maxMembers.toString()}
                      </span>
                      <RoundCell c={c} nowSec={nowSec} />
                      <span>
                        <Badge tone={statusTone(c.status)}>{STATUS_LABEL[c.status]}</Badge>
                      </span>
                      <ArrowRight size={16} className="hidden text-subtle md:block" aria-hidden />
                    </a>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </Card>
    </div>
  )
}
