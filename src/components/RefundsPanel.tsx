import { useReadContracts } from 'wagmi'
import type { Address } from 'viem'
import {
  Clock,
  Landmark,
  RotateCcw,
} from 'lucide-react'
import { vaultAbi } from '@/abi/vaultAbi'
import { CHAIN_ID } from '@/lib/chain'
import { formatDate, shortId, usdc } from '@/lib/format'
import { STATUS_NAMES } from '@/lib/roles'
import { useNowSeconds, usePayrollLabels, usePayrolls, type PayrollRow } from '@/hooks/data'
import { useTx } from '@/hooks/useTx'
import { AddressLink, Button, EmptyState, Notice, Skeleton } from '@/components/ui'

function ExpiredPayroll({
  vault,
  row,
  label,
}: {
  vault: Address
  row: PayrollRow
  label?: string
}) {
  const tx = useTx()
  const base = useReadContracts({
    allowFailure: false,
    query: { refetchInterval: 15_000 },
    contracts: [
      {
        address: vault,
        abi: vaultAbi,
        functionName: 'getPayrollEmployees',
        args: [row.id],
        chainId: CHAIN_ID,
      },
    ],
  })

  const employees = base.data?.[0]
  const allocations = useReadContracts({
    allowFailure: false,
    query: { enabled: Boolean(employees?.length), refetchInterval: 15_000 },
    contracts: (employees ?? []).map((employee) => ({
      address: vault,
      abi: vaultAbi,
      functionName: 'getAllocation' as const,
      args: [row.id, employee] as const,
      chainId: CHAIN_ID,
    })),
  })

  const open = (employees ?? [])
    .map((employee, index) => ({ employee, allocation: allocations.data?.[index] }))
    .filter(
      (item) =>
        item.allocation &&
        item.allocation.amount > 0n &&
        !item.allocation.claimed &&
        !item.allocation.refunded,
    )

  if (base.isLoading || allocations.isLoading) {
    return <Skeleton className="h-28 rounded-2xl" />
  }

  if (open.length === 0) return null

  return (
    <li className="inner rounded-2xl p-4 sm:p-5 space-y-3 bg-[#151515] border border-white/10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="font-bold text-base text-white font-display">
            {label ?? `Payroll Batch ${shortId(row.id)}`}
          </span>
          <span className="status status-cancelled">Expired</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-white/50 tabular-nums font-mono">
          <Clock className="size-3.5 text-white/40" />
          <span>Deadline passed on {formatDate(row.meta.deadline)}</span>
        </div>
      </div>

      <ul className="divide-y divide-white/5">
        {open.map(({ employee, allocation }) => (
          <li
            key={employee}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 first:pt-1 last:pb-1"
          >
            <div className="flex items-center gap-2">
              <AddressLink address={employee} />
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 border-t border-white/5 pt-2 sm:border-0 sm:pt-0">
              <span className="text-base font-bold tabular-nums text-white font-mono">
                {usdc(allocation?.amount ?? 0n)}{' '}
                <span className="text-xs font-normal text-white/50">USDC</span>
              </span>

              <Button
                variant="ghost"
                className="btn btn-secondary !min-h-10 text-xs px-3 font-semibold"
                loading={tx.busy}
                onClick={() =>
                  void tx.run(
                    (write) =>
                      write({
                        address: vault,
                        abi: vaultAbi,
                        functionName: 'refundLeftover',
                        args: [row.id, employee],
                      }),
                    {
                      success: 'USDC returned to funding treasury wallet.',
                    },
                  )
                }
              >
                <RotateCcw className="size-3.5" /> Reclaim to Treasury
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {tx.error && (
        <div className="mt-2">
          <Notice tone="bad">{tx.error}</Notice>
        </div>
      )}
    </li>
  )
}

/** Unclaimed pay on payrolls whose deadline has passed, with a refund action per employee. */
export function RefundsPanel({ vault }: { vault: Address }) {
  const payrolls = usePayrolls(vault)
  const { labels } = usePayrollLabels(vault)
  const now = useNowSeconds()
  const expired = (payrolls.data ?? []).filter(
    (row) =>
      STATUS_NAMES[row.meta.status] === 'Funded' &&
      row.meta.remainingEscrow > 0n &&
      BigInt(now) > row.meta.deadline,
  )

  return (
    <div className="employer-task-card p-5 sm:p-6 space-y-4 rounded-2xl bg-[#151515] border border-white/10">
      <div className="template-detail-action-strip flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <Landmark className="size-5 text-[#FE9E15]" />
          <div>
            <h3 className="text-base font-bold font-display text-white">Treasury Reclamation</h3>
            <p className="text-xs text-white/50">
              Recover unclaimed salary allocations from batches that surpassed their deadline.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-2">
        {payrolls.isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
        )}

        {!payrolls.isLoading && expired.length === 0 && (
          <EmptyState
            title="No expired allocations to reclaim"
            body="When a funded payroll reaches its claim deadline with an uncollected balance, each unclaimed allocation appears here for recovery back to the treasury wallet."
          />
        )}

        <ul className="space-y-3">
          {expired.map((row) => (
            <ExpiredPayroll key={row.id} vault={vault} row={row} label={labels[row.id]} />
          ))}
        </ul>
      </div>
    </div>
  )
}
