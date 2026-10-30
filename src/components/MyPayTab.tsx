import { useMemo, useState } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowDownLeft,
  Search,
} from 'lucide-react'
import type { Address } from 'viem'
import { vaultAbi } from '@/abi/vaultAbi'
import { CHAIN_ID } from '@/lib/chain'
import { formatDate, shortId, usdc } from '@/lib/format'
import { usePayrollLabels } from '@/hooks/data'
import { useTx } from '@/hooks/useTx'
import { EmptyState, Notice, Skeleton, StatusBadge } from '@/components/ui'

export function MyPayTab({ vault }: { vault: Address }) {
  const { address } = useAccount()
  const client = usePublicClient({ chainId: CHAIN_ID })
  const { labels } = usePayrollLabels(vault)
  const [search, setSearch] = useState('')
  const claimAll = useTx()
  const claimOne = useTx()

  const pay = useQuery({
    queryKey: ['myPay', vault, address],
    enabled: Boolean(client && address),
    queryFn: async () => {
      if (!client || !address) return null
      const [claimable, lifetime, ids] = await Promise.all([
        client.readContract({
          address: vault,
          abi: vaultAbi,
          functionName: 'getClaimableBalance',
          args: [address],
        }),
        client.readContract({
          address: vault,
          abi: vaultAbi,
          functionName: 'totalClaimed',
          args: [address],
        }),
        client.readContract({
          address: vault,
          abi: vaultAbi,
          functionName: 'getOpenPayrollIds',
          args: [address, 0n, 50n],
        }),
      ])
      const details = ids.length
        ? await client.multicall({
            allowFailure: false,
            contracts: ids.flatMap((id) => [
              { address: vault, abi: vaultAbi, functionName: 'getPayroll', args: [id] },
              { address: vault, abi: vaultAbi, functionName: 'getAllocation', args: [id, address] },
            ] as const),
          })
        : []
      const rows = ids.map((id, index) => {
        const meta = details[index * 2] as { deadline: bigint }
        const allocation = details[index * 2 + 1] as { amount: bigint }
        return { id, deadline: meta.deadline, amount: allocation.amount }
      })
      return { claimable, lifetime, rows }
    },
  })

  const rows = useMemo(() => pay.data?.rows ?? [], [pay.data?.rows])
  const claimable = pay.data?.claimable ?? 0n
  const lifetime = pay.data?.lifetime ?? 0n
  const claimedError = claimAll.error ?? claimOne.error

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const label = (labels[r.id] ?? '').toLowerCase()
      return label.includes(q) || r.id.toLowerCase().includes(q)
    })
  }, [rows, search, labels])

  if (!address) {
    return (
      <div className="p-4">
        <Notice tone="info">Connect your wallet to query on-chain salary claims.</Notice>
      </div>
    )
  }

  if (pay.isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-44 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="stack dashboard-shell dashboard-shell-employer employer-dashboard-premium employer-dashboard-redesign employee-claims-dashboard-page">
      <div className="employer-task-dashboard">
        {/* ─── Hero Section ─── */}
        <section className="employer-task-hero">
          <div className="employer-task-hero-copy">
            <span className="employer-task-kicker">Employee Claims</span>
            <h1>
              Available <span>Earnings</span>
            </h1>
            <p className="employer-task-hero-subtitle">
              Review and claim your earned salary payouts directly on Circle Arc.
            </p>
          </div>

          <div className="employer-task-hero-metrics" aria-label="Claims summary">
            <div className="employer-task-hero-metric">
              <span>Available to Claim</span>
              <strong className="text-[#38d996]">{usdc(claimable)} USDC</strong>
            </div>
            <div className="employer-task-hero-metric">
              <span>Ready Batches</span>
              <strong>{rows.length}</strong>
            </div>
            <div className="employer-task-hero-metric">
              <span>Lifetime Claimed</span>
              <strong>{usdc(lifetime)} USDC</strong>
            </div>
          </div>
        </section>

        {claimedError && (
          <div className="w-full" style={{ gridColumn: '1 / -1' }}>
            <Notice tone="bad">{claimedError}</Notice>
          </div>
        )}

        {/* ─── Itemized Payroll Allocations ─── */}
        <main className="employer-task-main">
          <section className="employer-task-card employer-payroll-board">
            <div className="employer-task-card-head">
              <div>
                <span>Claim operations</span>
                <h2>Your Claims</h2>
              </div>
              <div className="flex items-center gap-3">
                {claimable > 0n && (
                  <button
                    type="button"
                    disabled={claimAll.busy}
                    onClick={() =>
                      void claimAll.run(
                        (write) =>
                          write({
                            address: vault,
                            abi: vaultAbi,
                            functionName: 'claimSalary',
                          }),
                        { success: 'All claimable salary transferred to your wallet!' },
                      )
                    }
                    className="btn btn-primary !min-h-9 !py-1 text-xs !px-4 font-semibold !inline-flex items-center gap-2 whitespace-nowrap"
                  >
                    <ArrowDownLeft size={14} strokeWidth={2} />
                    <span>
                      {claimAll.status === 'wallet'
                        ? 'Confirm in Wallet…'
                        : claimAll.status === 'confirming'
                          ? 'Withdrawing…'
                          : `Claim All (${usdc(claimable)} USDC)`}
                    </span>
                  </button>
                )}
                <span className="employer-task-count">
                  {filteredRows.length} item{filteredRows.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            <div className="employer-payroll-toolbar employer-task-toolbar">
              <label className="employer-payroll-search employer-task-search">
                <Search size={15} strokeWidth={2} />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search claims by payroll name or ID…"
                />
              </label>
            </div>

            {rows.length === 0 ? (
              <div className="py-6">
                <EmptyState
                  title="No pending salary allocations"
                  body="When Finance funds an authorized payroll batch designating your address, it will be immediately claimable here."
                />
              </div>
            ) : filteredRows.length === 0 ? (
              <p className="muted employer-task-empty text-center py-6 text-xs text-white/40 font-mono">
                No claims match your search.
              </p>
            ) : (
              <div className="employer-task-payroll-list">
                {filteredRows.map((row) => (
                  <div
                    key={row.id}
                    className="employer-task-payroll-row"
                    style={{ gridTemplateColumns: 'minmax(0, 1fr) auto auto', alignItems: 'center' }}
                  >
                    <span className="employer-task-row-copy">
                      <strong>{labels[row.id] ?? `Payroll Batch ${shortId(row.id)}`}</strong>
                      <span>
                        Deadline: {formatDate(row.deadline)} · {usdc(row.amount)} USDC
                      </span>
                    </span>

                    <StatusBadge value="claim" />

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="btn btn-primary !min-h-8 !py-1 text-xs !px-3.5 font-semibold !inline-flex items-center gap-1.5"
                        style={{ display: 'inline-flex' }}
                        disabled={claimOne.busy}
                        onClick={() =>
                          void claimOne.run(
                            (write) =>
                              write({
                                address: vault,
                                abi: vaultAbi,
                                functionName: 'claimPayrollSalary',
                                args: [row.id],
                              }),
                            { success: 'Batch salary claimed to your wallet!' },
                          )
                        }
                      >
                        <ArrowDownLeft size={14} />
                        <span>Claim</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}
