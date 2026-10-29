import { useAccount, usePublicClient } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowDownLeft,
  Calendar,
  Coins,
  History,
  Sparkles,
} from 'lucide-react'
import type { Address } from 'viem'
import { vaultAbi } from '@/abi/vaultAbi'
import { CHAIN_ID } from '@/lib/chain'
import { formatDate, shortId, usdc } from '@/lib/format'
import { usePayrollLabels } from '@/hooks/data'
import { useTx } from '@/hooks/useTx'
import { Button, Card, EmptyState, Notice, Skeleton } from '@/components/ui'

export function MyPayTab({ vault }: { vault: Address }) {
  const { address } = useAccount()
  const client = usePublicClient({ chainId: CHAIN_ID })
  const { labels } = usePayrollLabels(vault)
  const claimAll = useTx()
  const claimOne = useTx()

  const pay = useQuery({
    queryKey: ['mypay', vault, address],
    enabled: Boolean(client && address),
    refetchInterval: 10_000,
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

  if (!address) {
    return <Notice tone="info">Connect your wallet to query on-chain salary claims.</Notice>
  }

  if (pay.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-44 rounded-3xl" />
        <Skeleton className="h-44 rounded-3xl" />
      </div>
    )
  }

  const data = pay.data
  const claimable = data?.claimable ?? 0n
  const claimedError = claimAll.error ?? claimOne.error

  return (
    <div className="space-y-6">
      {/* ─── Hero Balance Escrow Card ─── */}
      <Card glow className="relative overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
              <Coins className="size-4" /> Available for Immediate Withdrawal
            </div>

            <div className="flex items-baseline gap-2 pt-2">
              <span className="display text-4xl sm:text-6xl font-bold tracking-tight tabular-nums text-[var(--ink)]">
                {usdc(claimable)}
              </span>
              <span className="text-xl sm:text-2xl font-bold text-[var(--accent)]">USDC</span>
            </div>

            <div className="flex items-center gap-2 pt-1 text-xs text-[var(--muted)]">
              <History className="size-3.5 text-[var(--subtle)]" />
              <span>
                {data && data.lifetime > 0n
                  ? `${usdc(data.lifetime)} USDC lifetime claimed to this wallet`
                  : 'Tokens transfer directly from the company vault to your wallet'}
              </span>
            </div>
          </div>

          {/* Claim Action */}
          <div className="sm:max-w-xs w-full pt-2 sm:pt-0">
            <Button
              full
              disabled={claimable === 0n}
              loading={claimAll.busy}
              onClick={() =>
                void claimAll.run(
                  (write) =>
                    write({
                      address: vault,
                      abi: vaultAbi,
                      functionName: 'claimSalary',
                    }),
                  { success: 'Salary transferred to your wallet!' },
                )
              }
              className="py-4 text-base"
            >
              <ArrowDownLeft className="size-5" />
              {claimAll.status === 'wallet'
                ? 'Confirm in Wallet…'
                : claimAll.status === 'confirming'
                  ? 'Withdrawing from Escrow…'
                  : 'Claim All Available'}
            </Button>
          </div>
        </div>

        {claimedError && (
          <div className="mt-4">
            <Notice tone="bad">{claimedError}</Notice>
          </div>
        )}

        {(data?.rows.length ?? 0) > 50 && (
          <p className="mt-3 text-xs text-[var(--subtle)]">
            Large allocations process in 50-batch segments. After this transaction, trigger once more to claim remainder.
          </p>
        )}
      </Card>

      {/* ─── Itemized Payroll Allocations ─── */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-[var(--accent)]" />
            <h3 className="display text-lg font-bold">Unclaimed Payroll Allocations</h3>
          </div>
          <span className="text-xs text-[var(--muted)]">
            {data?.rows.length ?? 0} {data?.rows.length === 1 ? 'batch' : 'batches'}
          </span>
        </div>

        <div>
          {(data?.rows.length ?? 0) === 0 ? (
            <EmptyState
              title="No pending salary allocations"
              body="When Finance funds an authorized payroll batch that designates your address, it will be immediately claimable here."
            />
          ) : (
            <ul className="space-y-3">
              {data?.rows.map((row) => (
                <li
                  key={row.id}
                  className="inner flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl p-4 sm:p-5 transition-all hover:border-[var(--border-strong)]"
                >
                  <div className="space-y-1">
                    <div className="display font-bold text-base">
                      {labels[row.id] ?? `Payroll Batch ${shortId(row.id)}`}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--muted)] tabular-nums">
                      <Calendar className="size-3.5 text-[var(--subtle)]" />
                      <span>Reclamation deadline: {formatDate(row.deadline)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-[var(--border)] pt-3 sm:border-0 sm:pt-0">
                    <div className="display text-lg sm:text-xl font-bold tabular-nums">
                      {usdc(row.amount)}{' '}
                      <span className="text-xs font-normal text-[var(--muted)]">USDC</span>
                    </div>

                    <Button
                      variant="ghost"
                      className="!min-h-10 text-xs px-4"
                      loading={claimOne.busy}
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
                      Claim Batch
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  )
}
