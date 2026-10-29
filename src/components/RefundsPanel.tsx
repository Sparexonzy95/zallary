import { useReadContracts } from 'wagmi'
import type { Address } from 'viem'
import { vaultAbi } from '@/abi/vaultAbi'
import { CHAIN_ID } from '@/lib/chain'
import { formatDate, shortId, usdc } from '@/lib/format'
import { STATUS_NAMES } from '@/lib/roles'
import { useNowSeconds, usePayrollLabels, usePayrolls, type PayrollRow } from '@/hooks/data'
import { useTx } from '@/hooks/useTx'
import { AddressLink, Button, Card, EmptyState, Notice, Skeleton } from '@/components/ui'

function ExpiredPayroll({ vault, row, label }: { vault: Address; row: PayrollRow; label?: string }) {
  const tx = useTx()
  const base = useReadContracts({
    allowFailure: false,
    query: { refetchInterval: 15_000 },
    contracts: [{ address: vault, abi: vaultAbi, functionName: 'getPayrollEmployees', args: [row.id], chainId: CHAIN_ID }],
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
    .filter((item) => item.allocation && item.allocation.amount > 0n && !item.allocation.claimed && !item.allocation.refunded)

  if (base.isLoading || allocations.isLoading) return <Skeleton className="h-24" />
  if (open.length === 0) return null

  return (
    <li className="inner rounded-2xl p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="display font-semibold">{label ?? `Payroll ${shortId(row.id)}`}</div>
        <div className="text-xs" style={{ color: 'var(--muted)' }}>
          Deadline passed {formatDate(row.meta.deadline)}
        </div>
      </div>
      <ul className="mt-3 divide-y" style={{ borderColor: 'var(--border)' }}>
        {open.map(({ employee, allocation }) => (
          <li key={employee} className="flex flex-wrap items-center justify-between gap-3 py-2.5" style={{ borderColor: 'var(--border)' }}>
            <AddressLink address={employee} />
            <div className="flex items-center gap-3">
              <span className="tabular-nums">{usdc(allocation?.amount ?? 0n)} USDC</span>
              <Button
                variant="ghost"
                className="!min-h-10"
                loading={tx.busy}
                onClick={() =>
                  void tx.run((write) => write({ address: vault, abi: vaultAbi, functionName: 'refundLeftover', args: [row.id, employee] }), {
                    success: 'Returned to the wallet that funded this payroll.',
                  })
                }
              >
                Refund
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
    (row) => STATUS_NAMES[row.meta.status] === 'Funded' && row.meta.remainingEscrow > 0n && BigInt(now) > row.meta.deadline,
  )
  return (
    <Card>
      <h3 className="display text-lg font-semibold">Expired pay to reclaim</h3>
      <p className="mt-1 text-sm text-pretty" style={{ color: 'var(--muted)' }}>
        Pay that employees did not claim before the deadline. A refund goes back to the wallet that funded the payroll, one employee at a time.
      </p>
      <div className="mt-4">
        {payrolls.isLoading && <Skeleton className="h-24" />}
        {!payrolls.isLoading && expired.length === 0 && (
          <EmptyState title="Nothing to reclaim" body="When a funded payroll passes its deadline with pay still unclaimed, it shows up here." />
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
