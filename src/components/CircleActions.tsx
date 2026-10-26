import { useAccount, useBlockNumber } from 'wagmi'
import { ajoCircleAbi } from '@/lib/ajoAbi'
import { ajoContract, CHAIN_ID, Status, type Circle } from '@/lib/contract'
import { formatDuration, shortAddress, usd } from '@/lib/format'
import { navigate } from '@/lib/route'
import type { MemberState } from '@/hooks/useCircles'
import { Card, SectionTitle } from './ui'
import { TxAction } from './TxAction'

interface Props {
  circle: Circle
  me?: MemberState
  recipient?: `0x${string}`
  pending: bigint
  nowSec: number
}

const call = (functionName: string, id: bigint) => ({
  address: ajoContract.address,
  abi: ajoCircleAbi,
  functionName,
  args: [id] as const,
})

function Explain({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-sm text-ink-2 text-pretty">{children}</p>
}

export function CircleActions({ circle, me, recipient, pending, nowSec }: Props) {
  const { address } = useAccount()
  const { data: blockNumber } = useBlockNumber({ chainId: CHAIN_ID, watch: true })
  const id = circle.id
  const isMember = !!me
  const isCreator = !!address && address.toLowerCase() === circle.creator.toLowerCase()
  const full = circle.memberCount >= circle.maxMembers
  const collateral = circle.collateralRequired ? circle.contributionAmount : 0n

  let body: React.ReactNode = null

  if (circle.status === Status.Open) {
    body = (
      <div className="space-y-4">
        {!isMember && (
          <div>
            <Explain>
              {collateral > 0n
                ? `Joining locks ${usd(collateral)} USDC as collateral. You get it back when the circle completes, or if you leave before it starts.`
                : 'No collateral is required. Joining only reserves your seat.'}
            </Explain>
            <TxAction
              label={full ? 'Circle is full' : 'Join circle'}
              busyLabel="Joining…"
              disabled={full}
              successMessage="You joined the circle"
              approval={collateral > 0n ? { needed: collateral, approveAmount: collateral } : undefined}
              request={call('join', id)}
            />
          </div>
        )}
        {isMember && isCreator && (
          <div className="space-y-3">
            <Explain>
              {full
                ? circle.randomOrder
                  ? 'Everyone is in. Starting locks the group and commits to a future block that decides the payout order.'
                  : 'Everyone is in. Starting sets the payout order to join order and opens round 1.'
                : `Waiting for ${Number(circle.maxMembers - circle.memberCount)} more ${circle.maxMembers - circle.memberCount === 1n ? 'member' : 'members'} before you can start.`}
            </Explain>
            <TxAction
              label="Start circle"
              busyLabel="Starting…"
              disabled={!full}
              successMessage={circle.randomOrder ? 'Draw committed' : 'Circle started'}
              request={call('start', id)}
            />
            <TxAction
              label="Cancel circle and refund everyone"
              variant="danger"
              successMessage="Circle cancelled"
              request={call('cancelCircle', id)}
              onDone={() => navigate('/')}
            />
          </div>
        )}
        {isMember && !isCreator && (
          <div>
            <Explain>You are in. Waiting for the creator to start once every seat is filled. You can still leave for a full refund.</Explain>
            <TxAction label="Leave circle" variant="ghost" successMessage="You left the circle" request={call('leave', id)} />
          </div>
        )}
      </div>
    )
  }

  if (circle.status === Status.Drawing) {
    const ready = blockNumber !== undefined && blockNumber > circle.seedBlock
    const blocksLeft = blockNumber !== undefined && circle.seedBlock >= blockNumber ? circle.seedBlock - blockNumber + 1n : 0n
    body = (
      <div>
        <Explain>
          The group is locked. The payout order comes from the hash of block {circle.seedBlock.toString()}, which nobody
          could know when the circle started. Anyone can reveal it.
          {!ready && blocksLeft > 0n ? ` About ${blocksLeft.toString()} more blocks.` : ''}
        </Explain>
        <TxAction
          label="Reveal payout order"
          busyLabel="Revealing…"
          disabled={!ready}
          disabledReason="Waiting for the draw block."
          successMessage="Payout order revealed"
          request={call('finalizeDraw', id)}
        />
      </div>
    )
  }

  if (circle.status === Status.Active) {
    const deadline = Number(circle.roundDeadline)
    const left = deadline - nowSec
    const expired = left <= 0
    const allPaid = circle.paidCount === circle.memberCount
    const canSettle = allPaid || expired
    const roundsLeft = circle.maxMembers - circle.currentRound
    const owed = me && !me.paid
    body = (
      <div className="space-y-5">
        {isMember && (
          <div>
            {owed ? (
              <>
                <Explain>
                  {expired
                    ? 'The deadline passed, so you can no longer pay this round. Settle it to move on. Your collateral covers the missed payment.'
                    : `Pay ${usd(circle.contributionAmount)} USDC before the deadline. Missing it slashes your collateral and flags you as a defaulter.`}
                </Explain>
                <TxAction
                  label={`Contribute ${usd(circle.contributionAmount)} USDC`}
                  busyLabel="Paying…"
                  disabled={expired}
                  successMessage="Contribution sent"
                  approval={{ needed: circle.contributionAmount, approveAmount: circle.contributionAmount * roundsLeft }}
                  request={call('contribute', id)}
                />
              </>
            ) : (
              <p className="rounded-xl bg-success/12 p-3 text-sm font-semibold text-success">
                You paid for this round. Nothing else to do until it settles.
              </p>
            )}
          </div>
        )}
        <div>
          <Explain>
            {allPaid
              ? `Everyone has paid. Settling sends the pot to ${recipient ? shortAddress(recipient) : 'the recipient'} and opens the next round.`
              : expired
                ? 'The deadline has passed. Settling slashes collateral for anyone who missed, pays the pot, and opens the next round.'
                : `Settling opens when all ${circle.memberCount.toString()} members have paid or in ${formatDuration(left)}. Anyone can settle.`}
          </Explain>
          <TxAction
            label="Settle round and pay out"
            busyLabel="Settling…"
            variant={owed ? 'ghost' : 'primary'}
            disabled={!canSettle}
            successMessage="Round settled"
            request={call('settleRound', id)}
          />
        </div>
      </div>
    )
  }

  if (circle.status === Status.Completed) {
    body = (
      <p className="rounded-xl bg-success/12 p-3 text-sm font-semibold text-success">
        This circle is complete. Every member received a payout and remaining collateral was returned.
      </p>
    )
  }
  if (circle.status === Status.Cancelled) {
    body = <p className="rounded-xl bg-muted p-3 text-sm font-semibold text-ink-2">This circle was cancelled and collateral was refunded.</p>
  }

  return (
    <div className="space-y-4">
      {pending > 0n && (
        <Card className="border-warn/40">
          <SectionTitle>Funds waiting for you</SectionTitle>
          <Explain>
            {usd(pending)} USDC could not be sent automatically. Withdraw it to your wallet.
          </Explain>
          <TxAction label={`Withdraw ${usd(pending)} USDC`} successMessage="Withdrawn" request={call('withdraw', id)} />
        </Card>
      )}
      {body && (
        <Card>
          <SectionTitle>{circle.status === Status.Active ? 'This round' : 'Your move'}</SectionTitle>
          {body}
        </Card>
      )}
    </div>
  )
}
