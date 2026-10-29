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
import { Badge, Button, Card, EmptyState, Notice, Skeleton } from '@/components/ui'
import { FundPanel } from '@/components/FundPanel'
import { PrepareForm } from '@/components/PrepareForm'

interface Props {
  vault: Address
  isHR: boolean
  isFinance: boolean
  /** Show the form for preparing a new payroll above the list. */
  showPrepare?: boolean
  title?: string
}

const TONE = {
  Draft: 'warn',
  Funded: 'info',
  Completed: 'good',
  Refunded: 'neutral',
  Cancelled: 'bad',
} as const

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
    <li className="inner rounded-2xl p-4 sm:p-5 transition-all duration-200 hover:border-[var(--border-strong)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Info left */}
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="display text-base font-bold text-balance">
              {label ?? `Payroll Batch ${shortId(row.id)}`}
            </span>
            <Badge tone={TONE[status]}>{status}</Badge>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted)] tabular-nums">
            <span className="flex items-center gap-1">
              <Users className="size-3.5 text-[var(--subtle)]" />
              {row.meta.employeeCount} {row.meta.employeeCount === 1 ? 'employee' : 'employees'}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="size-3.5 text-[var(--subtle)]" />
              Claim by {formatDate(row.meta.deadline)}
            </span>
            <span className="mono text-[var(--subtle)]">ID: {shortId(row.id)}</span>
          </div>
        </div>

        {/* Amount right */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between border-t border-[var(--border)] pt-3 sm:border-0 sm:pt-0">
          <div className="display text-xl sm:text-2xl font-bold tabular-nums">
            {usdc(row.meta.totalFunded)}{' '}
            <span className="text-xs font-normal text-[var(--muted)]">USDC</span>
          </div>
          {funded && (
            <p className="text-xs text-[var(--muted)] tabular-nums">
              {usdc(claimed)} claimed ({percentClaimed}%)
            </p>
          )}
        </div>
      </div>

      {/* Progress Bar for funded batches */}
      {funded && (
        <div className="mt-3.5 space-y-1.5">
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{
                width: `${Math.min(100, Math.max(0, percentClaimed))}%`,
                background:
                  status === 'Completed'
                    ? 'var(--success)'
                    : 'linear-gradient(90deg, var(--accent), var(--accent-hover))',
              }}
            />
          </div>
        </div>
      )}

      {/* Action buttons */}
      {isDraft && (isHR || isFinance) && (
        <div className="mt-4 flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border)]">
          {isFinance && (
            <Button
              className="!min-h-10 text-xs px-4"
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
            className="!min-h-10 text-xs px-4"
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
        <div className="mt-4 pt-4 border-t border-[var(--border)]">
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

      <Card>
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="size-4 text-[var(--accent)]" />
            <h3 className="display text-lg font-bold">{title}</h3>
          </div>
          {payrolls.data && (
            <span className="mono text-xs text-[var(--subtle)]">
              {payrolls.data.length} {payrolls.data.length === 1 ? 'record' : 'records'}
            </span>
          )}
        </div>

        <div className="mt-4 space-y-3">
          {payrolls.isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
            </div>
          )}

          {payrolls.isError && (
            <Notice tone="bad">Could not query payroll batches from the vault. Check connection.</Notice>
          )}

          {!payrolls.isLoading && (payrolls.data?.length ?? 0) === 0 && (
            <EmptyState
              title="No payroll batches found"
              body={
                isHR
                  ? 'Prepare your first payroll draft above. Once submitted, Finance can review, audit, and fund it.'
                  : 'HR prepares payroll drafts. Once created, they appear here for Finance audit and funding.'
              }
            />
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
      </Card>
    </div>
  )
}
