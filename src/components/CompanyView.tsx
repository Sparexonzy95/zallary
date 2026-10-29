import { useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import type { Address } from 'viem'
import {
  ArrowLeft,
  ListChecks,
  Plus,
  Shield,
} from 'lucide-react'
import { useCompanies, useNowSeconds, usePayrolls, useRoles } from '@/hooks/data'
import { PORTALS, canOpen, defaultPortal, type Portal } from '@/lib/portals'
import { ROLE_LABEL, STATUS_NAMES } from '@/lib/roles'
import { shortAddress, usdc } from '@/lib/format'
import { Card, Notice, Skeleton } from '@/components/ui'
import { MyPayTab } from '@/components/MyPayTab'
import { PayrollsTab } from '@/components/PayrollsTab'
import { PrepareForm } from '@/components/PrepareForm'
import { TeamTab } from '@/components/TeamTab'

interface Props {
  vault: Address
  portal: Portal | null
  onBackToCompanies?: () => void
}

export function CompanyView({ vault, portal }: Props) {
  const { address, isConnected } = useAccount()
  const companies = useCompanies(address)
  const { roles, isLoading } = useRoles(vault, address)
  const payrolls = usePayrolls(vault)
  const nowSec = useNowSeconds()

  const [isCreatingHR, setIsCreatingHR] = useState(false)

  const company = companies.data?.find((c) => c.vault.toLowerCase() === vault.toLowerCase())

  const active = portal ?? defaultPortal(roles)
  const info = PORTALS.find((item) => item.key === active) ?? PORTALS[2]
  const allowed = canOpen(info, roles)

  // Aggregate metrics for HR
  const hrMetrics = useMemo(() => {
    const list = payrolls.data ?? []
    const totalVolume = list.reduce((sum, row) => sum + row.meta.totalFunded, 0n)
    const drafts = list.filter((row) => STATUS_NAMES[row.meta.status] === 'Draft')
    const funded = list.filter((row) => STATUS_NAMES[row.meta.status] === 'Funded')
    const completed = list.filter((row) => STATUS_NAMES[row.meta.status] === 'Completed')
    return {
      totalVolume,
      batchCount: list.length,
      draftCount: drafts.length,
      fundedCount: funded.length,
      completedCount: completed.length,
    }
  }, [payrolls.data])

  // Aggregate metrics for Finance
  const financeMetrics = useMemo(() => {
    const list = payrolls.data ?? []
    const ready = list.filter((row) => STATUS_NAMES[row.meta.status] === 'Draft')
    const totalReady = ready.reduce((sum, row) => sum + row.meta.totalFunded, 0n)
    const totalVolume = list.reduce((sum, row) => sum + row.meta.totalFunded, 0n)
    const expired = list.filter(
      (row) =>
        STATUS_NAMES[row.meta.status] === 'Funded' &&
        row.meta.remainingEscrow > 0n &&
        BigInt(nowSec) > row.meta.deadline,
    )
    return {
      readyCount: ready.length,
      readyTotal: totalReady,
      totalVolume,
      expiredCount: expired.length,
      totalCount: list.length,
    }
  }, [payrolls.data, nowSec])

  return (
    <div className="space-y-4">
      {!isConnected && (
        <Notice tone="info">Connect your wallet to verify authorization and access company controls.</Notice>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : !allowed ? (
        <Card className="py-12 text-center bg-[#151515] border border-white/10 rounded-2xl">
          <div className="flex size-12 items-center justify-center rounded-full bg-red-500/10 text-red-500 mx-auto mb-3">
            <Shield className="size-6" />
          </div>
          <h3 className="text-lg font-bold font-display text-white">Access Restricted</h3>
          <p className="mt-1 text-sm max-w-md mx-auto text-white/50">
            Your connected wallet does not hold the {info.role ? ROLE_LABEL[info.role] : ''} role required to view or execute actions in {info.label}.
          </p>
        </Card>
      ) : active === 'hr' ? (
        /* ═════════ HR PAYROLL PORTAL ═════════ */
        <div className="stack dashboard-shell dashboard-shell-employer employer-dashboard-premium employer-dashboard-redesign">
          <div className="employer-task-dashboard">
            <section className="employer-task-hero">
              <div className="employer-task-hero-copy">
                <span className="employer-task-kicker">HR Payroll · {company?.name || 'Company'}</span>
                <h1>
                  {isCreatingHR ? (
                    <>New <span>Payroll Draft</span></>
                  ) : (
                    <>Welcome back, <span>{company?.name || 'Company'}</span></>
                  )}
                </h1>
                <p className="employer-task-hero-subtitle">
                  {isCreatingHR
                    ? 'Configure recipient addresses and USDC allocations. Drafts are immutable and audited by Finance.'
                    : 'Draft employee payroll rosters, upload recipient allocations, and submit batches to Finance.'}
                </p>
              </div>

              <div className="employer-task-hero-metrics" aria-label="Payroll summary">
                <div className="employer-task-hero-metric">
                  <span>Payroll Volume</span>
                  <strong>{usdc(hrMetrics.totalVolume)} USDC</strong>
                </div>
                <div className="employer-task-hero-metric">
                  <span>Total Batches</span>
                  <strong>{hrMetrics.batchCount}</strong>
                </div>
                <div className="employer-task-hero-metric">
                  <span>Active Drafts</span>
                  <strong>{hrMetrics.draftCount}</strong>
                </div>
              </div>

              <div className="employer-task-actions">
                <button
                  type="button"
                  className="employer-task-primary-action"
                  onClick={() => setIsCreatingHR((prev) => !prev)}
                >
                  {isCreatingHR ? (
                    <>
                      <ArrowLeft size={15} strokeWidth={2} />
                      View Batches
                    </>
                  ) : (
                    <>
                      <Plus size={15} strokeWidth={2} />
                      New Payroll
                    </>
                  )}
                </button>
              </div>
            </section>

            {isCreatingHR ? (
              <main className="employer-task-main" style={{ gridColumn: '1 / -1' }}>
                <PrepareForm
                  vault={vault}
                  isFinance={roles.FINANCE}
                  onCancel={() => setIsCreatingHR(false)}
                  onSuccess={() => setIsCreatingHR(false)}
                />
              </main>
            ) : (
              <>
                <main className="employer-task-main">
                  <PayrollsTab
                    vault={vault}
                    isHR={true}
                    isFinance={roles.FINANCE}
                    initialFilter="all"
                  />
                </main>

                <aside className="employer-task-side">
                  <button
                    type="button"
                    className="employer-task-primary-action employer-sidebar-new-payroll"
                    onClick={() => setIsCreatingHR(true)}
                  >
                    <Plus size={15} strokeWidth={2} />
                    New Payroll
                  </button>

                  <div className="employer-task-card employer-status-sidebar">
                    <div className="employer-status-sidebar-head">
                      <span className="employer-task-side-icon">
                        <ListChecks size={14} strokeWidth={1.9} />
                      </span>
                      <div>
                        <span>Payroll Status</span>
                        <strong>{hrMetrics.batchCount} total</strong>
                      </div>
                    </div>

                    <div className="employer-status-row">
                      <span>Draft</span>
                      <strong>{hrMetrics.draftCount}</strong>
                    </div>
                    <div className="employer-status-row">
                      <span>Funded</span>
                      <strong>{hrMetrics.fundedCount}</strong>
                    </div>
                    <div className="employer-status-row">
                      <span>Completed</span>
                      <strong>{hrMetrics.completedCount}</strong>
                    </div>
                    <div className="employer-status-row">
                      <span>Network</span>
                      <strong className="text-[#38d996]">Arc Testnet</strong>
                    </div>
                  </div>
                </aside>
              </>
            )}
          </div>
        </div>
      ) : active === 'finance' ? (
        /* ═════════ FINANCE & TREASURY PORTAL ═════════ */
        <div className="stack dashboard-shell dashboard-shell-employer employer-dashboard-premium employer-dashboard-redesign finance-dashboard-page">
          <div className="employer-task-dashboard">
            <section className="employer-task-hero">
              <div className="employer-task-hero-copy">
                <span className="employer-task-kicker">Finance</span>
                <h1>
                  Funding <span>queue</span>
                </h1>
                <p className="employer-task-hero-subtitle">
                  Approve USDC and fund payroll runs after HR marks them ready.
                </p>
              </div>

              <div className="employer-task-hero-metrics" aria-label="Funding summary">
                <div className="employer-task-hero-metric">
                  <span>Ready runs</span>
                  <strong>{financeMetrics.readyCount}</strong>
                </div>
                <div className="employer-task-hero-metric">
                  <span>Total required</span>
                  <strong className="text-[#FE9E15]">{usdc(financeMetrics.readyTotal)} USDC</strong>
                </div>
              </div>
            </section>

            <main className="employer-task-main">
              <PayrollsTab
                vault={vault}
                isHR={false}
                isFinance={true}
                initialFilter="draft"
              />
            </main>
          </div>
        </div>
      ) : active === 'institution' ? (
        /* ═════════ INSTITUTION & GOVERNANCE PORTAL ═════════ */
        <div className="stack dashboard-shell dashboard-shell-employer employer-dashboard-premium employer-dashboard-redesign template-detail-page institution-workspace-page">
          <section className="employer-task-hero template-detail-hero">
            <div className="employer-task-hero-copy template-detail-hero-copy">
              <span className="employer-task-kicker">Institution workspace</span>
              <h1>{company?.name || 'Institution Vault'}</h1>
              <p className="employer-task-hero-subtitle">
                Connected as {shortAddress(address || vault)}.
              </p>
            </div>

            <div className="employer-task-hero-metrics template-detail-hero-metrics" aria-label="Institution summary">
              <div className="employer-task-hero-metric">
                <span>Status</span>
                <strong className="text-[#38d996]">Active</strong>
              </div>
              <div className="employer-task-hero-metric">
                <span>Active access</span>
                <strong>{roles.ADMIN ? 'Admin' : 'Officer'}</strong>
              </div>
            </div>
          </section>

          <div className="template-detail-layout institution-workspace-layout">
            <main className="template-detail-main institution-workspace-main space-y-6">
              <TeamTab vault={vault} isAdmin={roles.ADMIN} />
            </main>
          </div>
        </div>
      ) : (
        /* ═════════ EMPLOYEE PORTAL (MY PAY) ═════════ */
        <MyPayTab vault={vault} />
      )}
    </div>
  )
}
