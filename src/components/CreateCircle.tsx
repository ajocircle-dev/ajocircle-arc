import { useMemo, useState } from 'react'
import { parseEventLogs } from 'viem'
import { Coins, Dice5, ShieldCheck } from 'lucide-react'
import { ajoCircleAbi } from '@/lib/ajoAbi'
import { ajoContract } from '@/lib/contract'
import { formatRoundDuration, usd } from '@/lib/format'
import { circlePath, navigate } from '@/lib/route'
import { parseUsdc } from '@/onchain-money'
import { Card, Toggle } from './ui'
import { TxAction } from './TxAction'

const UNITS = { minutes: 60, hours: 3600, days: 86400 } as const
type Unit = keyof typeof UNITS

const PRESETS: { label: string; value: number; unit: Unit }[] = [
  { label: '5 min (demo)', value: 5, unit: 'minutes' },
  { label: '1 day', value: 1, unit: 'days' },
  { label: '1 week', value: 7, unit: 'days' },
  { label: '30 days', value: 30, unit: 'days' },
]

const inputClass =
  'min-h-12 w-full rounded-xl border bg-bg px-3.5 text-base text-ink placeholder:text-subtle focus:border-accent focus:outline-none'

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="block text-xs text-subtle">{hint}</span>}
    </label>
  )
}

export function CreateCircle() {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('50')
  const [members, setMembers] = useState('5')
  const [durValue, setDurValue] = useState('7')
  const [durUnit, setDurUnit] = useState<Unit>('days')
  const [randomOrder, setRandomOrder] = useState(false)
  const [collateral, setCollateral] = useState(true)

  const parsed = useMemo(() => {
    let contribution = 0n
    try {
      contribution = amount.trim() ? parseUsdc(amount.trim()) : 0n
    } catch {
      contribution = 0n
    }
    const maxMembers = Number(members)
    const seconds = Math.round(Number(durValue) * UNITS[durUnit])
    const errors: string[] = []
    if (!name.trim()) errors.push('Give your circle a name.')
    else if (new TextEncoder().encode(name.trim()).length > 64) errors.push('Name must be 64 characters or fewer.')
    if (contribution <= 0n) errors.push('Enter a contribution above zero.')
    if (!Number.isInteger(maxMembers) || maxMembers < 2 || maxMembers > 30) errors.push('Members must be between 2 and 30.')
    if (!Number.isFinite(seconds) || seconds < 60 || seconds > 365 * 86400) errors.push('Round length must be 1 minute to 365 days.')
    return { contribution, maxMembers, seconds, errors }
  }, [amount, members, durValue, durUnit, name])

  const pot = parsed.contribution * BigInt(Number.isInteger(parsed.maxMembers) ? parsed.maxMembers : 0)
  const valid = parsed.errors.length === 0

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="display text-3xl font-bold">Create a circle</h1>
        <p className="mt-1.5 text-ink-2">Set the rules once. Members join with a link, and payouts follow the order you choose.</p>
      </div>

      <Card className="space-y-5">
        <Field label="Circle name">
          <input
            className={inputClass}
            value={name}
            maxLength={64}
            placeholder="Family school fees"
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Contribution (USDC)" hint="Paid by each member every round">
            <input
              className={`${inputClass} tabular-nums`}
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            />
          </Field>
          <Field label="Members" hint="Also the number of rounds">
            <input
              className={`${inputClass} tabular-nums`}
              inputMode="numeric"
              value={members}
              onChange={(e) => setMembers(e.target.value.replace(/\D/g, ''))}
            />
          </Field>
        </div>

        <div className="space-y-2">
          <span className="text-sm font-semibold">Round length</span>
          <div className="grid grid-cols-[1fr_1.2fr] gap-3">
            <input
              className={`${inputClass} tabular-nums`}
              inputMode="decimal"
              aria-label="Round length value"
              value={durValue}
              onChange={(e) => setDurValue(e.target.value.replace(/[^0-9.]/g, ''))}
            />
            <select
              className={inputClass}
              aria-label="Round length unit"
              value={durUnit}
              onChange={(e) => setDurUnit(e.target.value as Unit)}
            >
              <option value="minutes">minutes</option>
              <option value="hours">hours</option>
              <option value="days">days</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setDurValue(String(p.value))
                  setDurUnit(p.unit)
                }}
                className="min-h-9 rounded-full bg-muted px-3 text-xs font-semibold text-ink-2 transition hover:bg-primary/15"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Toggle
            checked={randomOrder}
            onChange={setRandomOrder}
            label="Random payout order"
            hint="Drawn from a future block once the circle is full. Off means join order."
          />
          <Toggle
            checked={collateral}
            onChange={setCollateral}
            label="Require collateral"
            hint="Each member locks one contribution, slashed if they miss a round."
          />
        </div>
      </Card>

      <Card className="space-y-3 bg-muted !shadow-none">
        <div className="flex items-center gap-3">
          <Coins size={18} className="text-accent" aria-hidden />
          <p className="text-sm">
            Pot per round: <strong className="display text-accent tabular-nums">{usd(pot)} USDC</strong>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ShieldCheck size={18} className="text-primary" aria-hidden />
          <p className="text-sm">
            {collateral
              ? `You lock ${usd(parsed.contribution)} USDC collateral now, refunded at the end.`
              : 'No collateral. A missed payment makes that round\'s pot smaller.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Dice5 size={18} className="text-primary" aria-hidden />
          <p className="text-sm">
            {Number.isFinite(parsed.seconds) && parsed.seconds >= 60
              ? `${parsed.maxMembers || 0} rounds of ${formatRoundDuration(parsed.seconds)}, ${randomOrder ? 'random' : 'join'} order.`
              : 'Pick a round length.'}
          </p>
        </div>
      </Card>

      {!valid && name.length + amount.length > 0 && (
        <ul className="space-y-1 text-sm text-danger" aria-live="polite">
          {parsed.errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <TxAction
        label="Create circle"
        busyLabel="Creating circle…"
        disabled={!valid}
        disabledReason={valid ? undefined : 'Complete the form to continue.'}
        successMessage="Circle created"
        approval={collateral ? { needed: parsed.contribution, approveAmount: parsed.contribution } : undefined}
        request={{
          address: ajoContract.address,
          abi: ajoCircleAbi,
          functionName: 'createCircle',
          args: [name.trim(), parsed.contribution, BigInt(parsed.maxMembers || 0), BigInt(parsed.seconds || 0), randomOrder, collateral],
        }}
        onDone={(receipt) => {
          const [created] = parseEventLogs({ abi: ajoCircleAbi, eventName: 'CircleCreated', logs: receipt.logs })
          navigate(created ? circlePath(created.args.circleId) : '/')
        }}
      />
    </div>
  )
}
