import { useState } from 'react'
import type { Address } from 'viem'
import {
  Calendar,
  CheckCircle2,
  ChevronUp,
  FileSpreadsheet,
  Users,
  XCircle,
} from 'lucide-react'
import { vaultAbi } from '@/abi/vaultAbi'
import { formatDate, shortId, usdc } from '@/lib/format'
import { STATUS_NAMES } from '@/lib/roles'
import { usePayrollLabels, usePayrolls, useSeparateApprover, type PayrollRow } from '@/hooks/data'
import { useTx } from '@/hooks/useTx'
import { Button, EmptyState, Notice, Skeleton } from '@/components/ui'
import { FundPanel } from '@/components/FundPanel'
import { PrepareForm } from '@/components/PrepareForm'

interface Props {
  vault: Address
  isHR: boolean
  isFinance: boolean
  showPrepare?: boolean
  title?: string
}

const STATUS_CLASS: Record<string, string> = {
  Draft: 'status-draft',
  Funded: 'status-funded',
  Completed: 'status-completed',
  Refunded: 'status-scheduled',
  Cancelled: 'status-failed',
}

function Row({
  vault,
  row,
  label,
  isHR,
  isFinance,
}: {
  vault: Address
  row: PayrollRow
  label?: string
  isHR: boolean
  isFinance: boolean
}) {
  const [open, setOpen] = useState(false)
  const cancel = useTx()
  const status = STATUS_NAMES[row.meta.status] ?? 'Draft'
  const isDraft = status === 'Draft'
  const claimed = row.meta.totalFunded - row.meta.remainingEscrow
  const funded = status !== 'Draft' && status !== 'Cancelled'

  const percentClaimed =
    row.meta.totalFunded > 0n
      ? Number((claimed * 100n) / row.meta.totalFunded)
      : 0

  return (
    <li className="employer-task-card p-5 transition-all duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Info left */}
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-display text-base font-bold text-white">
              {label ?? `Payroll Batch ${shortId(row.id)}`}
            </span>
            <span className={`status ${STATUS_CLASS[status] ?? 'status-draft'}`}>
              {status}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-white/50 tabular-nums">
            <span className="flex items-center gap-1">
              <Users className="size-3.5 text-white/40" />
              {row.meta.employeeCount} {row.meta.employeeCount === 1 ? 'employee' : 'employees'}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="size-3.5 text-white/40" />
              Claim by {formatDate(row.meta.deadline)}
            </span>
            <span className="text-white/40">ID: {shortId(row.id)}</span>
          </div>
        </div>

        {/* Amount right */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between border-t border-white/10 pt-3 sm:border-0 sm:pt-0">
          <div className="font-display text-xl sm:text-2xl font-bold tabular-nums text-white">
            {usdc(row.meta.totalFunded)}{' '}
            <span className="text-xs font-normal text-white/50">USDC</span>
          </div>
          {funded && (
            <p className="font-mono text-xs text-[#38d996] tabular-nums">
              {usdc(claimed)} claimed ({percentClaimed}%)
            </p>
          )}
        </div>
      </div>

      {/* Progress Bar for funded batches */}
      {funded && (
        <div className="mt-3.5 space-y-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.max(0, percentClaimed))}%`,
                background:
                  status === 'Completed'
                    ? '#38d996'
                    : 'linear-gradient(90deg, #FE9E15, #ffb347)',
              }}
            />
          </div>
        </div>
      )}

      {/* Action buttons */}
      {isDraft && (isHR || isFinance) && (
        <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-white/10">
          {isFinance && (
            <Button
              className="btn btn-primary !min-h-10 text-xs px-4 font-semibold"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? (
                <>
                  <ChevronUp className="size-3.5" /> Hide Review
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-3.5" /> Review & Fund
                </>
              )}
            </Button>
          )}

          <Button
            variant="danger"
            className="btn btn-danger !min-h-10 text-xs px-4 font-semibold"
            loading={cancel.busy}
            onClick={() =>
              void cancel.run(
                (write) =>
                  write({
                    address: vault,
                    abi: vaultAbi,
                    functionName: 'cancelPayrollDraft',
                    args: [row.id],
                  }),
                {
                  success: 'Payroll draft cancelled on-chain.',
                },
              )
            }
          >
            <XCircle className="size-3.5" /> Cancel Draft
          </Button>
        </div>
      )}

      {cancel.error && (
        <div className="mt-3">
          <Notice tone="bad">{cancel.error}</Notice>
        </div>
      )}

      {/* Expandable Finance Review Screen */}
      {open && isDraft && isFinance && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <FundPanel vault={vault} id={row.id} meta={row.meta} />
        </div>
      )}
    </li>
  )
}

export function PayrollsTab({
  vault,
  isHR,
  isFinance,
  showPrepare = false,
  title = 'Payrolls',
}: Props) {
  const payrolls = usePayrolls(vault)
  const separate = useSeparateApprover(vault)
  const { labels } = usePayrollLabels(vault)

  return (
    <div className="space-y-6">
      {showPrepare && isHR && (
        <>
          {separate.enforced && (
            <Notice tone="warn">
              Maker-checker enforcement is active: A different Finance account must review and fund any payroll you draft.
            </Notice>
          )}
          <PrepareForm vault={vault} isFinance={isFinance} />
        </>
      )}

      <div className="employer-task-card employer-payroll-board">
        <div className="employer-task-card-head">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-[#FE9E15]" />
            <div>
              <span className="font-mono text-xs uppercase tracking-wider text-[#FE9E15]">Payroll Batches</span>
              <h2>{title}</h2>
            </div>
          </div>
          {payrolls.data && (
            <span className="employer-task-count">
              {payrolls.data.length} record{payrolls.data.length === 1 ? '' : 's'}
            </span>
          )}
        </div>

        <div className="p-4 sm:p-5">
          {payrolls.isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
          )}

          {payrolls.isError && (
            <Notice tone="bad">Could not query payroll batches from the vault. Check connection.</Notice>
          )}

          {!payrolls.isLoading && (payrolls.data?.length ?? 0) === 0 && (
            <div className="py-6">
              <EmptyState
                title="No payroll batches found"
                body={
                  isHR
                    ? 'Prepare your first payroll draft above. Once submitted, Finance can review, audit, and fund it.'
                    : 'HR prepares payroll drafts. Once created, they appear here for Finance audit and funding.'
                }
              />
            </div>
          )}

          <ul className="space-y-3">
            {payrolls.data?.map((row) => (
              <Row
                key={row.id}
                vault={vault}
                row={row}
                label={labels[row.id]}
                isHR={isHR}
                isFinance={isFinance}
              />
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
