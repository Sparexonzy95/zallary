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
import { AddressLink, Badge, Button, Card, EmptyState, Notice, Skeleton } from '@/components/ui'

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
    <li className="inner rounded-2xl p-4 sm:p-5 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <span className="display font-bold text-base">
            {label ?? `Payroll Batch ${shortId(row.id)}`}
          </span>
          <Badge tone="warn">Expired</Badge>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[var(--muted)] tabular-nums">
          <Clock className="size-3.5 text-[var(--subtle)]" />
          <span>Deadline passed on {formatDate(row.meta.deadline)}</span>
        </div>
      </div>

      <ul className="divide-y divide-[var(--border)]">
        {open.map(({ employee, allocation }) => (
          <li
            key={employee}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 first:pt-1 last:pb-1"
          >
            <div className="flex items-center gap-2">
              <AddressLink address={employee} />
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 border-t border-[var(--border)] pt-2 sm:border-0 sm:pt-0">
              <span className="display text-base font-bold tabular-nums">
                {usdc(allocation?.amount ?? 0n)}{' '}
                <span className="text-xs font-normal text-[var(--muted)]">USDC</span>
              </span>

              <Button
                variant="ghost"
                className="!min-h-10 text-xs px-3"
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
    <Card className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Landmark className="size-5 text-[var(--accent)]" />
          <div>
            <h3 className="display text-lg font-bold">Treasury Reclamation</h3>
            <p className="text-xs text-[var(--muted)]">
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
    </Card>
  )
}
