import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from 'viem'

const MESSAGES: Record<string, string> = {
  NotHR: 'Only an HR account can do this.',
  NotFinance: 'Only a Finance account can do this.',
  NotHRorFinance: 'Only HR or Finance can do this.',
  SelfApprovalNotAllowed: 'You prepared this payroll, so a different Finance account must fund it.',
  NotEmployeeOrRelayer: 'Only the employee or a relayer can claim this.',
  NoClaimableBalance: 'There is nothing to claim right now.',
  AlreadyClaimed: 'This pay was already claimed.',
  AlreadyRefunded: 'This pay was already returned to the company.',
  AllocationNotFound: 'You have no allocation in this payroll.',
  PayrollNotFound: 'This payroll does not exist.',
  PayrollAlreadyExists: 'A payroll with this ID already exists. Try again.',
  InvalidPayrollStatus: 'This payroll is not in the right state for that action.',
  InvalidDeadline: 'The deadline must be in the future.',
  DuplicateEmployee: 'The same employee address appears twice.',
  TooManyEmployees: 'A payroll can include at most 200 employees.',
  EmptyEmployees: 'Add at least one employee.',
  ZeroAddress: 'An address is empty or invalid.',
  ZeroAmount: 'Every amount must be greater than zero.',
  FeeTooHigh: 'The fee cannot be higher than 5%.',
  InvalidNameLength: 'The company name must be 1 to 64 characters.',
  EnforcedPause: 'This company is paused.',
  AccessControlUnauthorizedAccount: 'Your wallet does not have permission for this.',
  PayrollNotExpired: 'The payroll deadline has not passed yet.',
  SafeERC20FailedOperation: 'The USDC transfer failed. Check your balance and approval.',
}

/** Returns a plain-language message, or null when the user simply cancelled in their wallet. */
export function describeError(error: unknown): string | null {
  if (error instanceof BaseError) {
    if (error.walk((e) => e instanceof UserRejectedRequestError)) return null
    const revert = error.walk((e) => e instanceof ContractFunctionRevertedError)
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName
      if (name && MESSAGES[name]) return MESSAGES[name]
      if (name) return `The transaction was rejected (${name}).`
    }
    const text = error.shortMessage.toLowerCase()
    if (text.includes('insufficient funds')) return 'Not enough USDC for network fees. Use Get test USDC in the sidebar.'
    if (text.includes('user rejected')) return null
    return error.shortMessage
  }
  return 'Something went wrong. Please try again.'
}
