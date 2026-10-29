import { useAccount, usePublicClient } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import { Wallet } from 'lucide-react'
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
        client.readContract({ address: vault, abi: vaultAbi, functionName: 'getClaimableBalance', args: [address] }),
        client.readContract({ address: vault, abi: vaultAbi, functionName: 'totalClaimed', args: [address] }),
        client.readContract({ address: vault, abi: vaultAbi, functionName: 'getOpenPayrollIds', args: [address, 0n, 50n] }),
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

  if (!address) return <Notice tone="info">Connect your wallet to see your pay.</Notice>
  if (pay.isLoading) return <Skeleton className="h-48" />
  const data = pay.data
  const claimable = data?.claimable ?? 0n
  const claimedError = claimAll.error ?? claimOne.error

  return (
    <div className="space-y-5">
      <Card className="!p-7">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--muted)' }}>
          <Wallet className="size-4" /> Ready to claim
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="display text-5xl font-bold tabular-nums">{usdc(claimable)}</span>
          <span className="text-lg font-medium" style={{ color: 'var(--subtle)' }}>USDC</span>
        </div>
        <p className="mt-1.5 text-sm" style={{ color: 'var(--muted)' }}>
          {data && data.lifetime > 0n ? `${usdc(data.lifetime)} USDC already paid to you.` : 'Your pay is sent straight to this wallet.'}
        </p>
        {claimedError && (
          <div className="mt-4">
            <Notice tone="bad">{claimedError}</Notice>
          </div>
        )}
        <Button
          full
          className="mt-5"
          disabled={claimable === 0n}
          loading={claimAll.busy}
          onClick={() => void claimAll.run((write) => write({ address: vault, abi: vaultAbi, functionName: 'claimSalary' }), { success: 'Pay claimed to your wallet.' })}
        >
          {claimAll.status === 'wallet' ? 'Confirm in wallet' : claimAll.status === 'confirming' ? 'Claiming' : 'Claim all'}
        </Button>
        {(data?.rows.length ?? 0) > 50 && (
          <p className="mt-2 text-xs" style={{ color: 'var(--subtle)' }}>
            Large balances are claimed in batches of 50 payrolls. Claim again to collect the rest.
          </p>
        )}
      </Card>

      <Card>
        <h3 className="display text-lg font-semibold">Payrolls waiting for you</h3>
        <div className="mt-3">
          {(data?.rows.length ?? 0) === 0 ? (
            <EmptyState title="Nothing to claim" body="When Finance funds a payroll that includes your wallet, it shows up here." />
          ) : (
            <ul className="space-y-2">
              {data?.rows.map((row) => (
                <li key={row.id} className="inner flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
                  <div>
                    <div className="display font-semibold">{labels[row.id] ?? `Payroll ${shortId(row.id)}`}</div>
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>
                      Claim by {formatDate(row.deadline)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="display text-lg font-bold tabular-nums">{usdc(row.amount)}</span>
                    <Button
                      variant="ghost"
                      className="!min-h-10"
                      loading={claimOne.busy}
                      onClick={() =>
                        void claimOne.run((write) => write({ address: vault, abi: vaultAbi, functionName: 'claimPayrollSalary', args: [row.id] }), {
                          success: 'Pay claimed to your wallet.',
                        })
                      }
                    >
                      Claim
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
