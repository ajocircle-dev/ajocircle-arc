import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from 'viem'

const MESSAGES: Record<string, string> = {
  AlreadyMember: 'You are already a member of this circle.',
  AlreadyPaid: 'You already paid for this round.',
  CircleFull: 'This circle is full.',
  CircleNotFound: 'That circle does not exist.',
  CircleNotFull: 'The circle needs every seat filled before it can start.',
  CreatorCannotLeave: 'The creator cannot leave. Cancel the circle instead.',
  CreatorOnly: 'Only the circle creator can do this.',
  DrawNotReady: 'The draw block has not been reached yet. Try again in a few seconds.',
  InvalidContributionAmount: 'Enter a contribution above zero.',
  InvalidMaxMembers: 'A circle needs between 2 and 30 members.',
  InvalidName: 'Name must be 1 to 64 characters.',
  InvalidRoundDuration: 'Round length must be between 1 minute and 365 days.',
  InvalidStatus: 'This action is not available in the circle\'s current state.',
  NotMember: 'Only circle members can do this.',
  NothingToWithdraw: 'You have nothing to withdraw here.',
  RoundExpired: 'This round\'s deadline has passed. Settle the round to move on.',
  RoundNotSettleable: 'The round can be settled once everyone has paid or the deadline passes.',
  SafeERC20FailedOperation: 'The USDC transfer failed. Check your balance and approval.',
}

/** Turns any wallet / RPC / contract error into a short message. Returns null when the user simply cancelled. */
export function parseTxError(error: unknown): string | null {
  if (error instanceof BaseError) {
    if (error.walk((e) => e instanceof UserRejectedRequestError)) return null
    const reverted = error.walk((e) => e instanceof ContractFunctionRevertedError)
    if (reverted instanceof ContractFunctionRevertedError) {
      const name = reverted.data?.errorName
      if (name && MESSAGES[name]) return MESSAGES[name]
      if (name) return `Transaction would fail (${name}).`
    }
    const msg = error.shortMessage.toLowerCase()
    if (msg.includes('user rejected') || msg.includes('user denied')) return null
    if (msg.includes('insufficient funds')) {
      return 'Not enough USDC to cover gas. Get test USDC from the Arc Studio sidebar.'
    }
    if (msg.includes('exceeds balance') || msg.includes('transfer amount exceeds')) {
      return 'Insufficient USDC balance.'
    }
    return error.shortMessage
  }
  const e = error as { code?: number; message?: string } | null
  if (e?.code === 4001) return null
  return e?.message ? e.message.slice(0, 160) : 'Something went wrong. Please try again.'
}
