import { Check } from 'lucide-react'
import { erc20Abi, type TransactionReceipt } from 'viem'
import { useModal } from 'connectkit'
import { useSwitchChain } from 'wagmi'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useTx, type TxRequest } from '@/hooks/useTx'
import { useUsdc } from '@/hooks/useUsdc'
import { AJO_ADDRESS, CHAIN, CHAIN_ID, USDC_ADDRESS } from '@/lib/contract'
import { usd } from '@/lib/format'
import { buildTxExplorerUrl } from '@/onchain-facts'
import { Button } from './ui'

interface Props {
  label: string
  busyLabel?: string
  request: TxRequest
  successMessage: string
  /** USDC pulled by this action. When set, an approve step is shown first if the allowance is too low. */
  approval?: { needed: bigint; approveAmount: bigint }
  variant?: 'primary' | 'accent' | 'ghost' | 'danger'
  disabled?: boolean
  disabledReason?: string
  onDone?: (receipt: TransactionReceipt) => void
}

/** Wallet-aware action button: handles no wallet, not connected, wrong network, USDC approval, then the call. */
export function TxAction({
  label,
  busyLabel,
  request,
  successMessage,
  approval,
  variant = 'primary',
  disabled,
  disabledReason,
  onDone,
}: Props) {
  const status = useNetworkStatus()
  const { setOpen } = useModal()
  const { switchChain, isPending: switching } = useSwitchChain()
  const { balance, allowance } = useUsdc()
  const approveTx = useTx()
  const actionTx = useTx()

  if (status === 'no-wallet') {
    return (
      <Button block disabled variant="ghost">
        Install a wallet to continue
      </Button>
    )
  }
  if (status === 'disconnected') {
    return (
      <Button block onClick={() => setOpen(true)}>
        Connect wallet to continue
      </Button>
    )
  }
  if (status === 'wrong-network') {
    return (
      <Button block loading={switching} onClick={() => switchChain({ chainId: CHAIN_ID })}>
        Switch to {CHAIN.name}
      </Button>
    )
  }

  const needed = approval?.needed ?? 0n
  const needsApproval = !!approval && needed > 0n && (allowance ?? 0n) < needed
  const insufficient = needed > 0n && balance !== undefined && balance < needed
  const lastHash = actionTx.hash ?? approveTx.hash

  const doApprove = () =>
    approveTx.run(
      { address: USDC_ADDRESS, abi: erc20Abi, functionName: 'approve', args: [AJO_ADDRESS, approval?.approveAmount ?? needed] },
      'USDC approved',
    )

  const doAction = async () => {
    const receipt = await actionTx.run(request, successMessage)
    if (receipt) onDone?.(receipt)
  }

  return (
    <div className="space-y-2">
      {needsApproval && (
        <ol className="flex items-center gap-2 text-xs font-semibold text-subtle" aria-label="Steps">
          <li className="flex items-center gap-1.5 text-accent">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-accent text-[11px] text-white">1</span>
            Approve USDC
          </li>
          <li aria-hidden className="h-px flex-1 bg-line/30" />
          <li className="flex items-center gap-1.5">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-muted text-[11px]">2</span>
            Confirm
          </li>
        </ol>
      )}
      {!needsApproval && approval && needed > 0n && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-success">
          <Check size={14} aria-hidden /> USDC approved
        </p>
      )}

      {needsApproval ? (
        <Button
          block
          variant="accent"
          disabled={insufficient || disabled}
          loading={approveTx.busy}
          onClick={() => void doApprove()}
        >
          {approveTx.state === 'signing'
            ? 'Confirm approval in wallet…'
            : approveTx.state === 'confirming'
              ? 'Approving…'
              : `Approve ${usd(approval?.approveAmount ?? needed)} USDC`}
        </Button>
      ) : (
        <Button
          block
          variant={variant}
          disabled={disabled || insufficient}
          loading={actionTx.busy}
          onClick={() => void doAction()}
        >
          {actionTx.state === 'signing'
            ? 'Confirm in wallet…'
            : actionTx.state === 'confirming'
              ? (busyLabel ?? 'Confirming…')
              : label}
        </Button>
      )}

      {insufficient && (
        <p className="text-xs text-danger">
          You need {usd(needed)} USDC but hold {usd(balance ?? 0n)}. Fund this wallet with Arc USDC and try again.
        </p>
      )}
      {disabled && disabledReason && !insufficient && <p className="text-xs text-subtle">{disabledReason}</p>}
      {(actionTx.error || approveTx.error) && !actionTx.busy && !approveTx.busy && (
        <p className="text-xs text-danger" role="alert">
          {actionTx.error ?? approveTx.error}
        </p>
      )}
      {lastHash && actionTx.state === 'success' && (
        <a
          className="text-xs font-semibold text-accent underline"
          href={buildTxExplorerUrl(CHAIN_ID, lastHash)}
          target="_blank"
          rel="noopener noreferrer"
        >
          View transaction
        </a>
      )}
    </div>
  )
}
