import { useMemo, useState } from 'react'
import type { Address, Hex } from 'viem'
import {
  ArrowRight,
  Search,
  XCircle,
} from 'lucide-react'
import { vaultAbi } from '@/abi/vaultAbi'
import { formatDate, shortId, usdc } from '@/lib/format'
import { STATUS_NAMES } from '@/lib/roles'
import { useNowSeconds, usePayrollLabels, usePayrolls, type PayrollRow } from '@/hooks/data'
import { useTx } from '@/hooks/useTx'
import { EmptyState, Notice, Skeleton, StatusBadge } from '@/components/ui'
import { RefundsPanel } from '@/components/RefundsPanel'

interface Props {
  vault: Address
  isHR: boolean
  isFinance: boolean
  initialFilter?: 'all' | 'draft' | 'funded' | 'completed' | 'cancelled' | 'reclaims'
  hideFilters?: boolean
  title?: string
  eyebrow?: string
  onSelectPayroll?: (id: Hex) => void
}

function Row({
  vault,
  row,
  label,
  isHR,
  isFinance,
  onSelect,
}: {
  vault: Address
  row: PayrollRow
  label?: string
  isHR: boolean
  isFinance: boolean
  onSelect?: () => void
}) {
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
    <div className="space-y-2">
      <div
        className={`employer-task-payroll-row${isFinance ? ' cursor-pointer' : ''}`}
        onClick={() => {
          if (isFinance) onSelect?.()
        }}
        title={isFinance ? (isDraft ? 'Click to review and fund' : 'Click to view audit details') : undefined}
      >
        <span className="employer-task-row-copy">
          <strong>{label ?? `Payroll Batch ${shortId(row.id)}`}</strong>
          <span>
            Deadline: {formatDate(row.meta.deadline)} · {usdc(row.meta.totalFunded)} USDC
            {funded && ` (${percentClaimed}% claimed)`}
          </span>
        </span>

        <StatusBadge value={status} />

        <div className="flex items-center gap-2">
          {isDraft && isFinance && (
            <button
              type="button"
              className="btn btn-primary !min-h-8 !py-1 text-xs !px-3 font-semibold !inline-flex items-center gap-1.5"
              style={{ display: 'inline-flex' }}
              onClick={(e) => {
                e.stopPropagation()
                onSelect?.()
              }}
            >
              <ArrowRight size={14} />
              <span>Review & Fund</span>
            </button>
          )}

          {!isDraft && isFinance && (
            <button
              type="button"
              className="btn btn-secondary !min-h-8 !py-1 text-xs !px-3 font-semibold !inline-flex items-center gap-1.5"
              style={{ display: 'inline-flex' }}
              onClick={(e) => {
                e.stopPropagation()
                onSelect?.()
              }}
            >
              <span>View Audit</span>
              <ArrowRight size={14} />
            </button>
          )}

          {isDraft && isHR && (
            <button
              type="button"
              className="btn btn-danger !min-h-8 !py-1 text-xs px-2.5 font-semibold flex items-center gap-1"
              disabled={cancel.busy}
              onClick={(e) => {
                e.stopPropagation()
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
              }}
            >
              <XCircle size={14} />
              <span>Cancel</span>
            </button>
          )}

          {!isFinance && !isDraft && (
            <span className="employer-task-view-link">
              {status === 'Completed' ? 'Settled' : 'Funded'}
            </span>
          )}
        </div>
      </div>

      {cancel.error && (
        <div className="mt-2">
          <Notice tone="bad">{cancel.error}</Notice>
        </div>
      )}
    </div>
  )
}

export function PayrollsTab({
  vault,
  isHR,
  isFinance,
  initialFilter = 'all',
  hideFilters = false,
  title,
  eyebrow,
  onSelectPayroll,
}: Props) {
  const payrolls = usePayrolls(vault)
  const { labels } = usePayrollLabels(vault)
  const now = useNowSeconds()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter)

  const cardTitle = title ?? (isFinance ? 'Ready Payroll' : 'Your Payroll')
  const cardEyebrow = eyebrow ?? (isFinance ? 'Funding operations' : 'Payroll queue')

  const rows = useMemo(() => payrolls.data ?? [], [payrolls.data])

  const expiredCount = useMemo(() => {
    return rows.filter(
      (row) =>
        STATUS_NAMES[row.meta.status] === 'Funded' &&
        row.meta.remainingEscrow > 0n &&
        BigInt(now) > row.meta.deadline,
    ).length
  }, [rows, now])

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return rows.filter((row) => {
      const status = (STATUS_NAMES[row.meta.status] ?? 'Draft').toLowerCase()
      const label = (labels[row.id] ?? '').toLowerCase()
      const id = row.id.toLowerCase()

      const matchesSearch =
        !query || label.includes(query) || id.includes(query)

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'draft' && status === 'draft') ||
        (statusFilter === 'funded' && status === 'funded') ||
        (statusFilter === 'completed' && status === 'completed') ||
        (statusFilter === 'cancelled' && status === 'cancelled')

      return matchesSearch && matchesStatus
    })
  }, [rows, search, statusFilter, labels])

  const counts = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        const s = (STATUS_NAMES[row.meta.status] ?? 'Draft').toLowerCase()
        if (s === 'draft') acc.draft += 1
        else if (s === 'funded') acc.funded += 1
        else if (s === 'completed') acc.completed += 1
        else if (s === 'cancelled') acc.cancelled += 1
        return acc
      },
      { all: rows.length, draft: 0, funded: 0, completed: 0, cancelled: 0 },
    )
  }, [rows])

  const filterTabs = useMemo(() => {
    if (isFinance) {
      return [
        { key: 'draft', label: `Ready to Fund (${counts.draft})` },
        { key: 'all', label: `All (${counts.all})` },
        { key: 'funded', label: `Funded (${counts.funded})` },
        { key: 'completed', label: `Completed (${counts.completed})` },
        ...(counts.cancelled > 0 ? [{ key: 'cancelled', label: `Cancelled (${counts.cancelled})` }] : []),
        { key: 'reclaims', label: `Reclaims (${expiredCount})` },
      ]
    }
    return [
      { key: 'all', label: `All (${counts.all})` },
      { key: 'draft', label: `Draft (${counts.draft})` },
      { key: 'funded', label: `Funded (${counts.funded})` },
      { key: 'completed', label: `Completed (${counts.completed})` },
      ...(counts.cancelled > 0 ? [{ key: 'cancelled', label: `Cancelled (${counts.cancelled})` }] : []),
    ]
  }, [isFinance, counts, expiredCount])

  return (
    <section className="employer-task-card employer-payroll-board">
      <div className="employer-task-card-head">
        <div>
          <span>{cardEyebrow}</span>
          <h2>{cardTitle}</h2>
        </div>
        <span className="employer-task-count">
          {statusFilter === 'reclaims' ? `${expiredCount} reclaimable` : `${filteredRows.length} item${filteredRows.length === 1 ? '' : 's'}`}
        </span>
      </div>

      <div className="employer-payroll-toolbar employer-task-toolbar">
        <label className="employer-payroll-search employer-task-search">
          <Search size={15} strokeWidth={2} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search payroll..."
          />
        </label>

        {!hideFilters && (
          <div className="employer-payroll-filter-area employer-task-filter-area w-full overflow-x-auto overflow-y-hidden">
            <div className="filter-tabs employer-payroll-filters employer-task-filters flex items-center gap-1.5 flex-nowrap w-max">
              {filterTabs.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={`filter-tab shrink-0 whitespace-nowrap${statusFilter === option.key ? ' active' : ''}`}
                  onClick={() => setStatusFilter(option.key)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {statusFilter === 'reclaims' ? (
        <RefundsPanel vault={vault} />
      ) : payrolls.isLoading ? (
        <div className="space-y-3 p-2">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title={isFinance ? 'No runs ready for Finance' : 'No payroll runs yet'}
          body={isFinance ? 'Approve USDC and fund payroll runs after HR marks them ready.' : 'Create a draft payroll batch to upload allocations and submit for Finance funding.'}
        />
      ) : filteredRows.length === 0 ? (
        <p className="muted employer-task-empty text-center py-6 text-xs text-white/40 font-mono">
          {statusFilter === 'draft'
            ? 'No payroll runs are currently awaiting funding.'
            : 'No payroll matches your current search or filter.'}
        </p>
      ) : (
        <div className="employer-task-payroll-list">
          {filteredRows.map((row) => (
            <Row
              key={row.id}
              vault={vault}
              row={row}
              label={labels[row.id]}
              isHR={isHR}
              isFinance={isFinance}
              onSelect={() => onSelectPayroll?.(row.id)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
