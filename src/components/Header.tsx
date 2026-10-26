import { ConnectKitButton } from 'connectkit'
import { CircleDollarSign, Moon, Sun } from 'lucide-react'
import clsx from 'clsx'
import { useAccount } from 'wagmi'
import { TokenUSDC } from '@web3icons/react'
import { useTheme } from '@/hooks/useTheme'
import { useUsdc } from '@/hooks/useUsdc'
import { navigate, type Route } from '@/lib/route'
import { usd } from '@/lib/format'

const NAV: { label: string; path: string; match: Route['name'][] }[] = [
  { label: 'Circles', path: '/', match: ['dashboard', 'circle'] },
  { label: 'Create', path: '/create', match: ['create'] },
  { label: 'Activity', path: '/activity', match: ['activity'] },
]

function Balance() {
  const { isConnected } = useAccount()
  const { balance } = useUsdc()
  if (!isConnected || balance === undefined) return null
  return (
    <div className="hidden items-center gap-1.5 rounded-xl bg-muted px-3 py-2 text-sm font-semibold tabular-nums sm:flex">
      <TokenUSDC variant="branded" size={18} />
      {usd(balance)}
    </div>
  )
}

export function Header({ route }: { route: Route }) {
  const { theme, toggle } = useTheme()
  return (
    <header className="sticky top-0 z-30 border-b bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <a
          href="#/"
          className="flex items-center gap-2"
          aria-label="AjoCircle home"
          onClick={(e) => {
            e.preventDefault()
            navigate('/')
          }}
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-ink">
            <CircleDollarSign size={20} aria-hidden />
          </span>
          <span className="display text-lg font-bold">AjoCircle</span>
        </a>

        <nav className="ml-2 hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map((item) => (
            <a
              key={item.path}
              href={`#${item.path}`}
              className={clsx(
                'rounded-lg px-3 py-2 text-sm font-semibold transition hover:bg-muted',
                item.match.includes(route.name) ? 'text-primary' : 'text-ink-2',
              )}
              style={item.match.includes(route.name) && theme === 'dark' ? { color: 'rgb(var(--accent))' } : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Balance />
          <button
            type="button"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="grid h-11 w-11 place-items-center rounded-xl border text-ink-2 transition hover:bg-muted"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <ConnectKitButton.Custom>
            {({ isConnected, show, truncatedAddress, ensName }) => (
              <button
                type="button"
                onClick={show}
                className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-ink transition hover:brightness-110"
              >
                {isConnected ? (ensName ?? truncatedAddress) : 'Connect wallet'}
              </button>
            )}
          </ConnectKitButton.Custom>
        </div>
      </div>

      <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2 md:hidden" aria-label="Main mobile">
        {NAV.map((item) => (
          <a
            key={item.path}
            href={`#${item.path}`}
            className={clsx(
              'min-h-10 flex-1 rounded-lg px-3 py-2 text-center text-sm font-semibold',
              item.match.includes(route.name) ? 'bg-primary text-primary-ink' : 'bg-muted text-ink-2',
            )}
          >
            {item.label}
          </a>
        ))}
      </nav>
    </header>
  )
}
