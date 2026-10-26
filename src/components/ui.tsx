import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import clsx from 'clsx'

type Variant = 'primary' | 'accent' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
  block?: boolean
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-primary-ink hover:brightness-110 disabled:hover:brightness-100',
  accent: 'bg-accent text-white hover:brightness-110 disabled:hover:brightness-100',
  ghost: 'bg-transparent text-ink border border-line/25 hover:bg-muted',
  danger: 'bg-transparent text-danger border border-danger/40 hover:bg-danger/10',
}

export function Button({ variant = 'primary', loading, block, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition',
        'active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        block && 'w-full',
        className,
      )}
    >
      {loading && <Loader2 size={16} className="animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={clsx('rounded-2xl border bg-surface p-4 shadow-card sm:p-6', className)}>{children}</section>
  )
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="display text-lg font-semibold">{children}</h2>
      {aside}
    </div>
  )
}

const TONES = {
  neutral: 'bg-muted text-ink-2',
  teal: 'bg-primary/12 text-primary',
  blue: 'bg-accent/12 text-accent',
  green: 'bg-success/14 text-success',
  red: 'bg-danger/12 text-danger',
  amber: 'bg-warn/14 text-warn',
} as const

export function Badge({ tone = 'neutral', children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold',
        TONES[tone],
      )}
    >
      {children}
    </span>
  )
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'accent' }) {
  return (
    <div className="min-w-0 rounded-xl bg-muted p-3 sm:p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-subtle">{label}</div>
      <div className={clsx('display mt-1 truncate text-xl font-semibold tabular-nums sm:text-2xl', tone === 'accent' && 'text-accent')}>
        {value}
      </div>
      {hint && <div className="mt-0.5 text-xs text-subtle">{hint}</div>}
    </div>
  )
}

export function Notice({
  tone = 'neutral',
  icon,
  title,
  children,
  action,
}: {
  tone?: 'neutral' | 'warn' | 'danger' | 'blue'
  icon?: ReactNode
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  const toneClass = {
    neutral: 'bg-muted',
    warn: 'bg-warn/12 border-warn/30',
    danger: 'bg-danger/10 border-danger/30',
    blue: 'bg-accent/10 border-accent/30',
  }[tone]
  return (
    <div className={clsx('flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center', toneClass)} role="status">
      {icon && <div className="shrink-0">{icon}</div>}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{title}</div>
        {children && <div className="mt-0.5 text-sm text-ink-2">{children}</div>}
      </div>
      {action}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse rounded-lg bg-muted', className)} />
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  hint: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-14 w-full items-center justify-between gap-4 rounded-xl border bg-surface px-4 py-3 text-left transition hover:bg-muted"
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs text-subtle">{hint}</span>
      </span>
      <span
        className={clsx(
          'relative h-6 w-11 shrink-0 rounded-full transition',
          checked ? 'bg-primary' : 'bg-subtle/40',
        )}
      >
        <span
          className={clsx(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
            checked ? 'left-[22px]' : 'left-0.5',
          )}
        />
      </span>
    </button>
  )
}
