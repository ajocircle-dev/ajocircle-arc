import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { parseEventLogs, type Hash } from 'viem'
import { usePublicClient } from 'wagmi'
import { AJO_ADDRESS, AJO_DEPLOY_BLOCK, CHAIN_ID } from '@/lib/contract'
import { ajoCircleAbi } from '@/lib/ajoAbi'

export interface ActivityItem {
  key: string
  eventName: string
  circleId: bigint
  blockNumber: bigint
  logIndex: number
  txHash: Hash
  args: Record<string, unknown>
}

interface Progress {
  scanned: bigint
  head: bigint
  syncing: boolean
}

interface ActivityContextValue {
  items: ActivityItem[]
  progress: Progress
}

const ActivityContext = createContext<ActivityContextValue | null>(null)

const START_CHUNK = 400n
const MIN_CHUNK = 10n
const POLL_MS = 6_000
const CACHE_KEY = `ajo-activity-v1-${AJO_ADDRESS.toLowerCase()}`

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const serialize = (value: unknown) =>
  JSON.stringify(value, (_k, v: unknown) => (typeof v === 'bigint' ? { __b: v.toString() } : v))
const revive = (text: string): unknown =>
  JSON.parse(text, (_k, v: unknown) =>
    v && typeof v === 'object' && '__b' in v ? BigInt((v as { __b: string }).__b) : v,
  )

function loadCache(): { items: ActivityItem[]; next: bigint } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = revive(raw) as { items: ActivityItem[]; next: bigint }
    if (!Array.isArray(parsed.items) || typeof parsed.next !== 'bigint' || parsed.next < AJO_DEPLOY_BLOCK) return null
    return parsed
  } catch {
    return null
  }
}

function saveCache(items: ActivityItem[], next: bigint) {
  try {
    localStorage.setItem(CACHE_KEY, serialize({ items, next }))
  } catch {
    /* storage full or unavailable */
  }
}

/**
 * Reads AjoCircle events from the deployment block forward in adaptive ranges
 * (shrinks on RPC errors, grows back on success), then keeps polling new blocks.
 * Never starts from genesis. Progress is cached locally so reloads resume.
 */
export function ActivityProvider({ children }: { children: ReactNode }) {
  const client = usePublicClient({ chainId: CHAIN_ID })
  const [cached] = useState(loadCache)
  const [items, setItems] = useState<ActivityItem[]>(() => cached?.items ?? [])
  const [progress, setProgress] = useState<Progress>(() => {
    const next = cached?.next ?? AJO_DEPLOY_BLOCK
    return { scanned: next > 0n ? next - 1n : 0n, head: next, syncing: true }
  })
  const nextBlock = useRef(cached?.next ?? AJO_DEPLOY_BLOCK)
  const running = useRef(false)
  const all = useRef<ActivityItem[]>(cached?.items ?? [])
  const seen = useRef(new Set<string>((cached?.items ?? []).map((i) => i.key)))
  const chunk = useRef(START_CHUNK)

  useEffect(() => {
    if (!client) return
    let cancelled = false

    const fetchRange = async (from: bigint, to: bigint): Promise<ActivityItem[]> => {
      const logs = await client.getLogs({ address: AJO_ADDRESS, fromBlock: from, toBlock: to })
      const parsed = parseEventLogs({ abi: ajoCircleAbi, logs })
      return parsed.map((log) => {
        const args = (log as unknown as { args: Record<string, unknown> }).args
        return {
          key: `${log.transactionHash}-${log.logIndex}`,
          eventName: log.eventName,
          circleId: (args.circleId as bigint | undefined) ?? 0n,
          blockNumber: log.blockNumber,
          logIndex: log.logIndex,
          txHash: log.transactionHash,
          args,
        }
      })
    }

    const scan = async () => {
      if (running.current || cancelled) return
      running.current = true
      try {
        const head = await client.getBlockNumber()
        setProgress((p) => ({ ...p, head, syncing: nextBlock.current <= head }))
        let failures = 0
        while (!cancelled && nextBlock.current <= head && failures < 8) {
          const from = nextBlock.current
          const to = from + chunk.current - 1n > head ? head : from + chunk.current - 1n
          try {
            const found = await fetchRange(from, to)
            if (cancelled) return
            const fresh = found.filter((f) => !seen.current.has(f.key))
            fresh.forEach((f) => seen.current.add(f.key))
            if (fresh.length) {
              all.current = [...all.current, ...fresh]
              setItems(all.current)
            }
            nextBlock.current = to + 1n
            saveCache(all.current, nextBlock.current)
            setProgress({ scanned: to, head, syncing: to < head })
            chunk.current = chunk.current * 2n > START_CHUNK ? START_CHUNK : chunk.current * 2n
            if (nextBlock.current <= head) await sleep(250)
          } catch {
            failures += 1
            chunk.current = chunk.current / 2n < MIN_CHUNK ? MIN_CHUNK : chunk.current / 2n
            await sleep(800 * failures)
          }
        }
      } catch {
        // transient RPC failure: the next poll retries from the same block
      } finally {
        running.current = false
      }
    }

    void scan()
    const timer = setInterval(() => void scan(), POLL_MS)
    const onRefresh = () => void scan()
    window.addEventListener('ajo:refresh', onRefresh)
    return () => {
      cancelled = true
      clearInterval(timer)
      window.removeEventListener('ajo:refresh', onRefresh)
    }
  }, [client])

  const sorted = useMemo(
    () =>
      [...items].sort((a, b) =>
        a.blockNumber === b.blockNumber ? b.logIndex - a.logIndex : a.blockNumber > b.blockNumber ? -1 : 1,
      ),
    [items],
  )

  const value = useMemo(() => ({ items: sorted, progress }), [sorted, progress])
  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>
}

export function useActivity() {
  const ctx = useContext(ActivityContext)
  if (!ctx) throw new Error('useActivity must be used inside ActivityProvider')
  return ctx
}

const blockTimeCache = new Map<string, number>()

/** Block timestamps (seconds) for the given blocks, fetched lazily and cached. */
export function useBlockTimes(blocks: bigint[]): Record<string, number> {
  const client = usePublicClient({ chainId: CHAIN_ID })
  const [times, setTimes] = useState<Record<string, number>>(() => Object.fromEntries(blockTimeCache))
  const wanted = useMemo(() => Array.from(new Set(blocks.map((b) => b.toString()))), [blocks])
  const wantedKey = wanted.join(',')

  useEffect(() => {
    if (!client) return
    const missing = wanted.filter((b) => !blockTimeCache.has(b))
    if (!missing.length) return
    let cancelled = false
    void Promise.all(
      missing.map(async (b) => {
        try {
          const block = await client.getBlock({ blockNumber: BigInt(b) })
          blockTimeCache.set(b, Number(block.timestamp))
        } catch {
          /* leave unresolved */
        }
      }),
    ).then(() => {
      if (!cancelled) setTimes(Object.fromEntries(blockTimeCache))
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, wantedKey])

  return times
}
