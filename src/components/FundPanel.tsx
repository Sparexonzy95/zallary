import { useAccount, useReadContracts } from 'wagmi'
import { erc20Abi, type Address, type Hex } from 'viem'
import { vaultAbi } from '@/abi/vaultAbi'
import { CHAIN_ID, USDC_ADDRESS } from '@/lib/chain'
import { bpsToPercent, shortAddress, usdc } from '@/lib/format'
import { useNowSeconds, useSeparateApprover, type Payroll } from '@/hooks/data'
import { useTx } from '@/hooks/useTx'
import { useAddFunds } from '@/lib/addFunds'
import { Button, Notice, Skeleton } from '@/components/ui'

interface Props {
  vault: Address
  id: Hex
  meta: Payroll
}

/** Finance review screen: shows exactly what will be paid and charged, then approves and funds. */
export function FundPanel({ vault, id, meta }: Props) {
  const { address } = useAccount()
  const approve = useTx()
  const addFunds = useAddFunds()
  const now = useNowSeconds()
  const separate = useSeparateApprover(vault)
  const fund = useTx()

  const base = useReadContracts({
    allowFailure: false,
    query: { refetchInterval: 10_000 },
    contracts: [
      { address: vault, abi: vaultAbi, functionName: 'getPayrollEmployees', args: [id], chainId: CHAIN_ID },
      { address: vault, abi: vaultAbi, functionName: 'calculateFee', args: [meta.totalFunded], chainId: CHAIN_ID },
      { address: vault, abi: vaultAbi, functionName: 'feeBps', chainId: CHAIN_ID },
      { address: USDC_ADDRESS, abi: erc20Abi, functionName: 'balanceOf', args: [address ?? vault], chainId: CHAIN_ID },
      { address: USDC_ADDRESS, abi: erc20Abi, functionName: 'allowance', args: [address ?? vault, vault], chainId: CHAIN_ID },
    ],
  })
  const employees = base.data?.[0]
  const allocations = useReadContracts({
    allowFailure: false,
    query: { enabled: Boolean(employees?.length) },
    contracts: (employees ?? []).map((employee) => ({
      address: vault,
      abi: vaultAbi,
      functionName: 'getAllocation' as const,
      args: [id, employee] as const,
      chainId: CHAIN_ID,
    })),
  })

  if (base.isLoading || !base.data) return <Skeleton className="h-40" />
  const [, feeResult, feeBps, balance, allowance] = base.data
  const [fee, charge] = feeResult
  const preparedByMe = separate.enforced && address !== undefined && meta.createdByHR.toLowerCase() === address.toLowerCase()
  const expired = BigInt(now) >= meta.deadline
  const enoughBalance = balance >= charge
  const needsApproval = allowance < charge
  const blocked = preparedByMe || expired

  return (
    <div className="mt-3 space-y-3">
      <div className="inner rounded-2xl p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--muted)' }}>
          Who gets paid
        </p>
        <ul className="max-h-44 space-y-1 overflow-y-auto text-sm">
          {employees?.map((employee, index) => (
            <li key={employee} className="flex justify-between">
              <span className="mono text-xs">{shortAddress(employee)}</span>
              <span className="tabular-nums">{allocations.data?.[index] ? usdc(allocations.data[index].amount) : '…'}</span>
            </li>
          ))}
        </ul>
      </div>
      <dl className="inner space-y-1.5 rounded-2xl p-4 text-sm">
        <div className="flex justify-between">
          <dt style={{ color: 'var(--muted)' }}>Salaries</dt>
          <dd className="tabular-nums">{usdc(meta.totalFunded)} USDC</dd>
        </div>
        <div className="flex justify-between">
          <dt style={{ color: 'var(--muted)' }}>Fee ({bpsToPercent(feeBps)})</dt>
          <dd className="tabular-nums">{usdc(fee)} USDC</dd>
        </div>
        <div className="flex justify-between border-t pt-2 font-semibold" style={{ borderColor: 'var(--border)' }}>
          <dt>You pay</dt>
          <dd className="display text-lg tabular-nums">{usdc(charge)} USDC</dd>
        </div>
        <div className="flex justify-between text-xs" style={{ color: 'var(--subtle)' }}>
          <dt>Your USDC balance</dt>
          <dd className="tabular-nums">{usdc(balance)}</dd>
        </div>
      </dl>
      {preparedByMe && <Notice tone="warn">You prepared this payroll, so a different Finance account must fund it. The company admin can change this rule in Team and fees.</Notice>}
      {expired && <Notice tone="warn">The claim deadline has passed. Ask HR to prepare a new payroll.</Notice>}
      {!enoughBalance && !blocked && (
        <Notice tone="warn">
          Your wallet needs {usdc(charge - balance)} more USDC.{' '}
          <button onClick={addFunds.open} className="font-semibold underline">
            Add USDC
          </button>
        </Notice>
      )}
      {(approve.error || fund.error) && <Notice tone="bad">{approve.error ?? fund.error}</Notice>}
      {needsApproval ? (
        <Button
          full
          disabled={blocked || !enoughBalance}
          loading={approve.busy}
          onClick={() =>
            void approve.run(
              (write) => write({ address: USDC_ADDRESS, abi: erc20Abi, functionName: 'approve', args: [vault, charge] }),
              { success: 'Approved. You can fund the payroll now.' },
            )
          }
        >
          {approve.status === 'wallet' ? 'Confirm in wallet' : approve.status === 'confirming' ? 'Approving' : `Step 1 of 2: approve ${usdc(charge)} USDC`}
        </Button>
      ) : (
        <Button
          full
          disabled={blocked || !enoughBalance}
          loading={fund.busy}
          onClick={() =>
            void fund.run((write) => write({ address: vault, abi: vaultAbi, functionName: 'fundPayroll', args: [id] }), {
              success: 'Payroll funded. Employees can claim now.',
            })
          }
        >
          {fund.status === 'wallet' ? 'Confirm in wallet' : fund.status === 'confirming' ? 'Funding' : 'Fund payroll'}
        </Button>
      )}
      <p className="text-xs text-pretty" style={{ color: 'var(--subtle)' }}>
        The approval covers exactly this total plus fee. If the fee changes before you fund, the payment fails instead of charging more.
      </p>
    </div>
  )
}
