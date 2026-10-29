import { useState } from 'react'
import type { Address } from 'viem'
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

const TONE = { Draft: 'warn', Funded: 'info', Completed: 'good', Refunded: 'neutral', Cancelled: 'bad' } as const

function Row({ vault, row, label, isHR, isFinance }: { vault: Address; row: PayrollRow; label?: string; isHR: boolean; isFinance: boolean }) {
  const [open, setOpen] = useState(false)
  const cancel = useTx()
  const status = STATUS_NAMES[row.meta.status] ?? 'Draft'
  const isDraft = status === 'Draft'
  const claimed = row.meta.totalFunded - row.meta.remainingEscrow
  const funded = status !== 'Draft' && status !== 'Cancelled'

  return (
    <li className="inner rounded-2xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="display truncate text-base font-semibold">{label ?? `Payroll ${shortId(row.id)}`}</div>
          <div className="mt-0.5 text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
            {row.meta.employeeCount} employees · claim by {formatDate(row.meta.deadline)}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="display text-lg font-bold tabular-nums">{usdc(row.meta.totalFunded)}</span>
          <Badge tone={TONE[status]}>{status}</Badge>
        </div>
      </div>
      {funded && (
        <p className="mt-2 text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
          Claimed {usdc(claimed)} of {usdc(row.meta.totalFunded)} USDC
        </p>
      )}
      {isDraft && (isHR || isFinance) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {isFinance && (
            <Button className="!min-h-10" onClick={() => setOpen((v) => !v)}>
              {open ? 'Hide review' : 'Review and fund'}
            </Button>
          )}
          <Button
            variant="danger"
            className="!min-h-10"
            loading={cancel.busy}
            onClick={() =>
              void cancel.run((write) => write({ address: vault, abi: vaultAbi, functionName: 'cancelPayrollDraft', args: [row.id] }), {
                success: 'Draft cancelled.',
              })
            }
          >
            Cancel draft
          </Button>
        </div>
      )}
      {cancel.error && (
        <div className="mt-2">
          <Notice tone="bad">{cancel.error}</Notice>
        </div>
      )}
      {open && isDraft && isFinance && <FundPanel vault={vault} id={row.id} meta={row.meta} />}
    </li>
  )
}

export function PayrollsTab({ vault, isHR, isFinance, showPrepare = false, title = 'Payrolls' }: Props) {
  const payrolls = usePayrolls(vault)
  const separate = useSeparateApprover(vault)
  const { labels } = usePayrollLabels(vault)
  return (
    <div className="space-y-5">
      {showPrepare && isHR && (
        <>
          {separate.enforced && (
            <Notice tone="warn">A different Finance account must fund each payroll you prepare. You cannot fund your own drafts.</Notice>
          )}
          <PrepareForm vault={vault} isFinance={isFinance} />
        </>
      )}
      <Card>
        <h3 className="display text-lg font-semibold">{title}</h3>
        <div className="mt-3 space-y-3">
          {payrolls.isLoading && <Skeleton className="h-24" />}
          {payrolls.isError && <Notice tone="bad">Could not load payrolls. Try again in a moment.</Notice>}
          {!payrolls.isLoading && (payrolls.data?.length ?? 0) === 0 && (
            <EmptyState
              title="No payrolls yet"
              body={isHR ? 'Prepare the first payroll above. Finance will then review and fund it.' : 'HR prepares payrolls here. You will review and fund them once they exist.'}
            />
          )}
          <ul className="space-y-3">
            {payrolls.data?.map((row) => (
              <Row key={row.id} vault={vault} row={row} label={labels[row.id]} isHR={isHR} isFinance={isFinance} />
            ))}
          </ul>
        </div>
      </Card>
    </div>
  )
}
