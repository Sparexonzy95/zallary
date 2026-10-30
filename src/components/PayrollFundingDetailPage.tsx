import { useAccount, useReadContracts } from 'wagmi'
import { erc20Abi, type Address, type Hex } from 'viem'
import {
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  ShieldAlert,
  Wallet,
} from 'lucide-react'
import { vaultAbi } from '@/abi/vaultAbi'
import { CHAIN_ID, USDC_ADDRESS } from '@/lib/chain'
import { bpsToPercent, formatDate, shortId, usdc } from '@/lib/format'
import { ROLE, STATUS_NAMES } from '@/lib/roles'
import { useNowSeconds, usePayrollLabels, useRoles, useSeparateApprover, type Payroll } from '@/hooks/data'
import { useTx } from '@/hooks/useTx'
import { useAddFunds } from '@/lib/addFunds'
import { Button, Notice, Skeleton, StatusBadge } from '@/components/ui'

interface Props {
  vault: Address
  id: Hex
  meta: Payroll
  onBack: () => void
  onFunded?: () => void
}

export function PayrollFundingDetailPage({ vault, id, meta, onBack, onFunded }: Props) {
  const { address } = useAccount()
  const approve = useTx()
  const addFunds = useAddFunds()
  const grantFinance = useTx()
  const now = useNowSeconds()
  const separate = useSeparateApprover(vault)
  const fund = useTx()
  const { roles } = useRoles(vault, address)
  const { labels } = usePayrollLabels(vault)

  const status = STATUS_NAMES[meta.status] ?? 'Draft'
  const isDraft = status === 'Draft'
  const label = labels[id]

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

  if (base.isLoading || !base.data) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }

  const [, feeResult, feeBps, balance, allowance] = base.data
  const [fee, charge] = feeResult
  const preparedByMe =
    separate.enforced &&
    address !== undefined &&
    meta.createdByHR.toLowerCase() === address.toLowerCase()
  const expired = BigInt(now) >= meta.deadline
  const isFinanceOfficer = roles.FINANCE
  const isAdmin = roles.ADMIN
  const enoughBalance = balance >= charge
  const needsApproval = allowance < charge
  const blocked = preparedByMe || expired || !isFinanceOfficer

  return (
    <div className="stack run-detail-page dashboard-shell dashboard-shell-employer employer-dashboard-premium employer-dashboard-redesign space-y-6">
      {/* ─── Back Navigation ─── */}
      <button
        type="button"
        className="template-detail-back-link run-detail-back-link inline-flex items-center gap-1.5 text-xs font-semibold text-white/50 hover:text-white transition-colors"
        onClick={onBack}
      >
        <ArrowLeft size={14} strokeWidth={2} />
        <span>Back to Funding Queue</span>
      </button>

      {/* ─── Hero Section ─── */}
      <section className="employer-task-hero run-detail-hero">
        <div className="employer-task-hero-copy run-detail-hero-copy">
          <span className="employer-task-kicker run-detail-hero-kicker">Finance · Funding Audit</span>
          <h1>{label ?? `Payroll Batch ${shortId(id)}`}</h1>
          <p className="employer-task-hero-subtitle">
            Audit immutable payroll draft, authorize USDC allowance, and deposit escrow on Circle Arc.
          </p>
        </div>

        <div className="employer-task-hero-metrics run-detail-hero-metrics">
          <div className="employer-task-hero-metric">
            <span>Required Escrow</span>
            <strong className="text-[#FE9E15]">{usdc(charge)} USDC</strong>
          </div>
          <div className="employer-task-hero-metric">
            <span>Gross Salaries</span>
            <strong>{usdc(meta.totalFunded)} USDC</strong>
          </div>
          <div className="employer-task-hero-metric">
            <span>Recipients</span>
            <strong>{employees?.length ?? 0}</strong>
          </div>
          <div className="employer-task-hero-metric">
            <span>Status</span>
            <strong className={isDraft ? 'text-[#FE9E15]' : 'text-[#38d996]'}>{status}</strong>
          </div>
        </div>
      </section>

      {/* ─── Audit & Funding Command Panel ─── */}
      <section className="employer-task-card template-detail-command-panel run-detail-command-panel p-6 sm:p-8 space-y-6 rounded-2xl bg-[#151515] border border-white/10">
        <div className="template-detail-action-strip run-detail-action-strip flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <FileCheck2 className="size-5 text-[#FE9E15]" />
            <div>
              <strong className="text-base text-white font-display block">
                {isDraft ? 'Audit & Treasury Funding Execution' : 'Settled Escrow Details'}
              </strong>
              <span className="text-xs text-white/50 block">Circle Arc Testnet · Non-Custodial Vault</span>
            </div>
          </div>
          <StatusBadge value={isDraft ? 'funding_ready' : status.toLowerCase()} />
        </div>

        {/* ─── Roster Breakdown Table ─── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-white/50 px-1 font-mono uppercase tracking-wider">
            <span>Audited Recipients ({employees?.length ?? 0})</span>
            <span>Allocated Amount (USDC)</span>
          </div>

          <div className="inner max-h-56 overflow-y-auto rounded-xl p-3 divide-y divide-white/5 text-sm bg-white/[0.02] border border-white/5">
            {employees?.map((employee, index) => (
              <div key={employee} className="flex items-center justify-between py-2.5 px-2 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-white/40">#{index + 1}</span>
                  <span className="mono text-xs text-white/80">{employee}</span>
                </div>
                <span className="mono text-xs tabular-nums font-semibold text-white">
                  {allocations.data?.[index] ? `${usdc(allocations.data[index].amount)} USDC` : '…'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Financial Accounting Breakdown ─── */}
        <dl className="inner rounded-xl p-5 space-y-3 text-sm bg-white/[0.02] border border-white/10">
          <div className="flex justify-between text-white/60">
            <dt>Total Salary Allocations</dt>
            <dd className="tabular-nums font-medium text-white font-mono">{usdc(meta.totalFunded)} USDC</dd>
          </div>
          <div className="flex justify-between text-white/60">
            <dt>Protocol Fee ({bpsToPercent(feeBps)})</dt>
            <dd className="tabular-nums font-medium text-white font-mono">{usdc(fee)} USDC</dd>
          </div>
          <div className="flex justify-between text-white/60">
            <dt>Claim Deadline</dt>
            <dd className="tabular-nums font-medium text-white font-mono">{formatDate(meta.deadline)}</dd>
          </div>
          <div className="h-px bg-white/10 my-1" />
          <div className="flex justify-between font-bold text-base">
            <dt className="text-white">Total Treasury Escrow Required</dt>
            <dd className="display text-xl text-[#FE9E15] tabular-nums font-mono">{usdc(charge)} USDC</dd>
          </div>
          <div className="flex justify-between text-xs text-white/40 pt-1 font-mono">
            <dt className="flex items-center gap-1.5">
              <Wallet className="size-3.5" /> Your Connected USDC Balance
            </dt>
            <dd className="tabular-nums font-semibold text-white/80">{usdc(balance)} USDC</dd>
          </div>
        </dl>

        {/* ─── Status Notices ─── */}
        {!isFinanceOfficer && (
          <Notice tone="warn">
            {isAdmin ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <ShieldAlert className="size-4 text-[#FE9E15]" />
                  <span>Finance Officer Role Required</span>
                </div>
                <p className="text-xs text-white/70">
                  Your connected wallet is the <strong>Institution Admin</strong>, but on-chain escrow funding requires the <strong>Finance Officer</strong> role. You can grant this role to yourself immediately:
                </p>
                <Button
                  loading={grantFinance.busy}
                  className="btn btn-primary !min-h-9 text-xs font-semibold"
                  onClick={() =>
                    address &&
                    void grantFinance.run(
                      (write) =>
                        write({
                          address: vault,
                          abi: vaultAbi,
                          functionName: 'grantRole',
                          args: [ROLE.FINANCE, address],
                        }),
                      { success: 'Finance Officer role granted! You may now approve and fund.' },
                    )
                  }
                >
                  Assign Finance Role to My Wallet
                </Button>
              </div>
            ) : (
              'Your connected wallet does not hold the Finance Officer role required to fund payroll drafts.'
            )}
          </Notice>
        )}

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

        {/* ─── 2-Step Funding Action ─── */}
        {isDraft ? (
          <div className="space-y-3 pt-2">
            {needsApproval ? (
              <Button
                full
                disabled={blocked || !enoughBalance}
                loading={approve.busy}
                className="btn btn-primary min-h-12 text-sm font-semibold !flex items-center justify-center gap-2"
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
                className="btn btn-primary min-h-12 text-sm font-semibold !flex items-center justify-center gap-2"
                onClick={() =>
                  void fund.run(
                    (write) =>
                      write({
                        address: vault,
                        abi: vaultAbi,
                        functionName: 'fundPayroll',
                        args: [id],
                      }),
                    {
                      success: 'Payroll funded! USDC is in escrow and employees may claim.',
                      onDone: () => onFunded?.(),
                    },
                  )
                }
              >
                <CheckCircle2 className="size-4" />
                {fund.status === 'wallet'
                  ? 'Confirm in Wallet…'
                  : fund.status === 'confirming'
                    ? 'Depositing to Escrow On-Chain…'
                    : 'Step 2 of 2: Fund Payroll to Escrow'}
              </Button>
            )}

            <p className="text-[11px] text-white/40 text-center leading-normal">
              Vault approval is restricted to the exact audited sum ({usdc(charge)} USDC). Tokens transfer directly into the company's segregated escrow.
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center space-y-1">
            <span className="text-sm font-semibold text-[#38d996] flex items-center justify-center gap-1.5">
              <CheckCircle2 size={16} /> Escrow Active & Funded
            </span>
            <p className="text-xs text-white/50">
              Allocations are locked on Circle Arc Testnet. Employees can connect their wallets and claim directly.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
