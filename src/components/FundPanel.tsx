import { useAccount, useReadContracts } from 'wagmi'
import { erc20Abi, type Address, type Hex } from 'viem'
import {
  FileCheck2,
  Wallet,
} from 'lucide-react'
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

/** Finance review screen: shows exact audit breakdown and executes funding from treasury. */
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

  if (base.isLoading || !base.data) return <Skeleton className="h-44 rounded-2xl" />

  const [, feeResult, feeBps, balance, allowance] = base.data
  const [fee, charge] = feeResult
  const preparedByMe =
    separate.enforced &&
    address !== undefined &&
    meta.createdByHR.toLowerCase() === address.toLowerCase()
  const expired = BigInt(now) >= meta.deadline
  const enoughBalance = balance >= charge
  const needsApproval = allowance < charge
  const blocked = preparedByMe || expired

  return (
    <div className="employer-task-card template-detail-command-panel run-detail-command-panel p-5 sm:p-6 space-y-5 rounded-2xl bg-[#151515] border border-white/10">
      <div className="template-detail-action-strip run-detail-action-strip flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <FileCheck2 className="size-5 text-[#FE9E15]" />
          <div>
            <strong className="text-base text-white font-display block">Finance Audit & Escrow Execution</strong>
            <span className="text-xs text-white/50 block">Direct Treasury Funding on Arc Testnet</span>
          </div>
        </div>
        <span className="status status-funding_ready">Ready for Funding</span>
      </div>

      {/* ─── Employees Roster Table ─── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-white/50 px-1 font-mono uppercase tracking-wider">
          <span>Recipients ({employees?.length ?? 0})</span>
          <span>Allocation (USDC)</span>
        </div>

        <div className="inner max-h-48 overflow-y-auto rounded-xl p-2.5 divide-y divide-white/5 text-sm bg-white/[0.02] border border-white/5">
          {employees?.map((employee, index) => (
            <div key={employee} className="flex items-center justify-between py-2 px-1.5 first:pt-0 last:pb-0">
              <span className="mono text-xs text-white/70">{shortAddress(employee)}</span>
              <span className="mono text-xs tabular-nums font-semibold text-white">
                {allocations.data?.[index] ? `${usdc(allocations.data[index].amount)} USDC` : '…'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Financial Accounting Summary ─── */}
      <dl className="inner rounded-xl p-4 space-y-2.5 text-sm bg-white/[0.02] border border-white/10">
        <div className="flex justify-between text-white/60">
          <dt>Total Salary Allocations</dt>
          <dd className="tabular-nums font-medium text-white font-mono">{usdc(meta.totalFunded)} USDC</dd>
        </div>
        <div className="flex justify-between text-white/60">
          <dt>Protocol Fee ({bpsToPercent(feeBps)})</dt>
          <dd className="tabular-nums font-medium text-white font-mono">{usdc(fee)} USDC</dd>
        </div>
        <div className="h-px bg-white/10 my-1" />
        <div className="flex justify-between font-bold text-base">
          <dt className="text-white">Total Treasury Deduction</dt>
          <dd className="display text-lg text-[#FE9E15] tabular-nums font-mono">{usdc(charge)} USDC</dd>
        </div>
        <div className="flex justify-between text-xs text-white/40 pt-1 font-mono">
          <dt className="flex items-center gap-1.5">
            <Wallet className="size-3.5" /> Your USDC Balance
          </dt>
          <dd className="tabular-nums font-semibold text-white/80">{usdc(balance)} USDC</dd>
        </div>
      </dl>

      {/* ─── Status Notices ─── */}
      {preparedByMe && (
        <Notice tone="warn">
          Self-approval is blocked: You drafted this payroll batch. Under company policy, a distinct Finance account must audit and execute funding.
        </Notice>
      )}

      {expired && (
        <Notice tone="bad">
          This payroll batch deadline has expired ({new Date(Number(meta.deadline) * 1000).toLocaleString()}). Request HR to create a renewed draft.
        </Notice>
      )}

      {!enoughBalance && !blocked && (
        <Notice tone="warn">
          Treasury balance is short by {usdc(charge - balance)} USDC.{' '}
          <button onClick={addFunds.open} className="font-semibold underline hover:text-white">
            Add USDC to Wallet
          </button>
        </Notice>
      )}

      {(approve.error || fund.error) && (
        <Notice tone="bad">{approve.error ?? fund.error}</Notice>
      )}

      {/* ─── 2-Step Execution Flow ─── */}
      <div className="space-y-2 pt-2">
        {needsApproval ? (
          <Button
            full
            disabled={blocked || !enoughBalance}
            loading={approve.busy}
            className="btn btn-primary min-h-12 text-sm font-semibold"
            onClick={() =>
              void approve.run(
                (write) =>
                  write({
                    address: USDC_ADDRESS,
                    abi: erc20Abi,
                    functionName: 'approve',
                    args: [vault, charge],
                  }),
                { success: 'USDC allowance approved for vault. Proceed to Step 2.' },
              )
            }
          >
            {approve.status === 'wallet'
              ? 'Confirm in Wallet…'
              : approve.status === 'confirming'
                ? 'Confirming Approval On-Chain…'
                : `Step 1 of 2: Authorize ${usdc(charge)} USDC`}
          </Button>
        ) : (
          <Button
            full
            disabled={blocked || !enoughBalance}
            loading={fund.busy}
            className="btn btn-primary min-h-12 text-sm font-semibold"
            onClick={() =>
              void fund.run(
                (write) =>
                  write({
                    address: vault,
                    abi: vaultAbi,
                    functionName: 'fundPayroll',
                    args: [id],
                  }),
                { success: 'Payroll funded! USDC is in escrow and employees may claim.' },
              )
            }
          >
            {fund.status === 'wallet'
              ? 'Confirm in Wallet…'
              : fund.status === 'confirming'
                ? 'Depositing to Escrow…'
                : 'Step 2 of 2: Fund Payroll to Escrow'}
          </Button>
        )}

        <p className="text-[11px] text-white/40 text-center leading-normal">
          Vault approval is restricted to the exact audited sum ({usdc(charge)} USDC). Tokens transfer directly into the company's segregated escrow.
        </p>
      </div>
    </div>
  )
}
