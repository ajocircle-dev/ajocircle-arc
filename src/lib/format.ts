import { formatUnitsFixed } from '@/onchain-money'
import { USDC_DECIMALS } from './contract'

export const shortAddress = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`

/** Formats a raw USDC amount (6-decimal ERC-20 view) with thousands separators. */
export function usd(raw: bigint, digits = 2): string {
  const fixed = formatUnitsFixed(raw, USDC_DECIMALS, digits)
  const [whole, frac] = fixed.split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return frac ? `${grouped}.${frac}` : grouped
}

export function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0s'
  const d = Math.floor(totalSeconds / 86400)
  const h = Math.floor((totalSeconds % 86400) / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = Math.floor(totalSeconds % 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function formatRoundDuration(seconds: number): string {
  if (seconds % 86400 === 0) {
    const d = seconds / 86400
    return d === 1 ? '1 day' : `${d} days`
  }
  if (seconds % 3600 === 0) {
    const h = seconds / 3600
    return h === 1 ? '1 hour' : `${h} hours`
  }
  if (seconds % 60 === 0) {
    const m = seconds / 60
    return m === 1 ? '1 minute' : `${m} minutes`
  }
  return `${seconds}s`
}

export function formatDate(tsSeconds: number): string {
  return new Date(tsSeconds * 1000).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function timeAgo(tsSeconds: number, nowMs: number): string {
  const diff = Math.max(0, Math.floor(nowMs / 1000) - tsSeconds)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}
