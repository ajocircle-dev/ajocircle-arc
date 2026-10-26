import { AlertTriangle, PlugZap, WalletMinimal } from 'lucide-react'
import { useSwitchChain } from 'wagmi'
import { useModal } from 'connectkit'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { CHAIN, CHAIN_ID } from '@/lib/contract'
import { parseTxError } from '@/lib/errors'
import { toast } from 'sonner'
import { Button, Notice } from './ui'

/** Explains exactly why actions are blocked: no wallet, not connected, or wrong network. */
export function NetworkBanner() {
  const status = useNetworkStatus()
  const { switchChainAsync, isPending } = useSwitchChain()
  const { setOpen } = useModal()

  if (status === 'ready') return null

  if (status === 'no-wallet') {
    return (
      <Notice
        tone="warn"
        icon={<WalletMinimal size={22} className="text-warn" aria-hidden />}
        title="No wallet found in this browser"
        action={
          <a
            href="https://metamask.io/download/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-ink"
          >
            Install a wallet
          </a>
        }
      >
        You can browse circles, but to join or contribute you need a browser wallet such as MetaMask. Install one, then
        reload this page.
      </Notice>
    )
  }

  if (status === 'disconnected') {
    return (
      <Notice
        tone="blue"
        icon={<PlugZap size={22} className="text-accent" aria-hidden />}
        title="Connect your wallet to take part"
        action={<Button onClick={() => setOpen(true)}>Connect wallet</Button>}
      >
        Circles are public to read. Connect to create, join, contribute, or settle.
      </Notice>
    )
  }

  return (
    <Notice
      tone="danger"
      icon={<AlertTriangle size={22} className="text-danger" aria-hidden />}
      title={`Wrong network. AjoCircle runs on ${CHAIN.name}.`}
      action={
        <Button
          loading={isPending}
          onClick={() => {
            switchChainAsync({ chainId: CHAIN_ID }).catch((e: unknown) => {
              const msg = parseTxError(e)
              if (msg) toast.error(msg)
            })
          }}
        >
          Switch to {CHAIN.name}
        </Button>
      }
    >
      Your wallet is on a different network, so transactions are paused until you switch.
    </Notice>
  )
}
