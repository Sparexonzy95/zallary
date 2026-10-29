import { useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import type { Address } from 'viem'
import {
  ArrowLeft,
  ListChecks,
  Plus,
  Shield,
} from 'lucide-react'
import { useCompanies, useNowSeconds, usePayrolls, useRoles, useSeparateApprover } from '@/hooks/data'
import { PORTALS, canOpen, defaultPortal, type Portal } from '@/lib/portals'
import { ROLE_LABEL, STATUS_NAMES, type RoleKey } from '@/lib/roles'
import { shortAddress, usdc } from '@/lib/format'
import { Card, Notice, Skeleton } from '@/components/ui'
import { MyPayTab } from '@/components/MyPayTab'
import { PayrollsTab } from '@/components/PayrollsTab'
import { PrepareForm } from '@/components/PrepareForm'
import { RefundsPanel } from '@/components/RefundsPanel'
import { PoliciesSection, RolesSection } from '@/components/TeamTab'

interface Props {
  vault: Address
  portal: Portal | null
  onBackToCompanies?: () => void
}

type FinanceTab = 'fund' | 'all' | 'refunds' | 'direct'
type GovernanceTab = 'roles' | 'policies'

export function CompanyView({ vault, portal, onBackToCompanies }: Props) {
  const { address, isConnected } = useAccount()
  const companies = useCompanies(address)
  const { roles, isLoading } = useRoles(vault, address)
  const payrolls = usePayrolls(vault)
  const separate = useSeparateApprover(vault)
  const nowSec = useNowSeconds()

  const [isCreatingHR, setIsCreatingHR] = useState(false)
  const [financeTab, setFinanceTab] = useState<FinanceTab>('fund')
  const [governanceTab, setGovernanceTab] = useState<GovernanceTab>('roles')

  const company = companies.data?.find((c) => c.vault.toLowerCase() === vault.toLowerCase())

  const active = portal ?? defaultPortal(roles)
  const info = PORTALS.find((item) => item.key === active) ?? PORTALS[2]
  const allowed = canOpen(info, roles)

  const myAssignedRoles = (Object.keys(roles) as RoleKey[]).filter((key) => roles[key])

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
    const expired = list.filter(
      (row) =>
        STATUS_NAMES[row.meta.status] === 'Funded' &&
        row.meta.remainingEscrow > 0n &&
        BigInt(nowSec) > row.meta.deadline,
    )
    return {
      readyCount: ready.length,
      readyTotal: totalReady,
      expiredCount: expired.length,
      totalCount: list.length,
    }
  }, [payrolls.data, nowSec])

  const financeTabs: { key: FinanceTab; label: string }[] = [
    { key: 'fund', label: `Review & Fund (${financeMetrics.readyCount})` },
    { key: 'all', label: `All Batches (${financeMetrics.totalCount})` },
    { key: 'refunds', label: `Treasury Refunds (${financeMetrics.expiredCount})` },
    ...(roles.HR && !separate.enforced ? [{ key: 'direct' as const, label: 'Direct Fund' }] : []),
  ]

  return (
    <div className="space-y-4">
      {/* ─── Clean Context Breadcrumb ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2 text-xs text-white/50 font-mono">
          {onBackToCompanies && (
            <button
              type="button"
              onClick={onBackToCompanies}
              className="hover:text-white transition-colors flex items-center gap-1 font-sans text-xs font-semibold"
            >
              <ArrowLeft size={13} /> Workspaces
            </button>
          )}
          <span>/</span>
          <span className="text-white font-semibold font-sans">{company?.name ?? 'Company Vault'}</span>
          <span className="text-white/30 hidden sm:inline">({shortAddress(vault)})</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {myAssignedRoles.map((key) => (
            <span
              key={key}
              className={`status ${key === 'ADMIN' ? 'status-active' : 'status-funding_ready'}`}
            >
              {ROLE_LABEL[key]}
            </span>
          ))}
          {myAssignedRoles.length === 0 && isConnected && (
            <span className="status status-scheduled">Employee</span>
          )}
        </div>
      </div>

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
                  className="employer-task-primary-action font-semibold text-xs sm:text-sm flex items-center gap-1.5"
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
                <span className="employer-task-kicker">Finance & Treasury · {company?.name || 'Company'}</span>
                <h1>
                  Funding <span>Queue</span>
                </h1>
                <p className="employer-task-hero-subtitle">
                  Audit immutable payroll drafts, deposit USDC escrow, and reclaim expired employee balances.
                </p>
              </div>

              <div className="employer-task-hero-metrics" aria-label="Funding summary">
                <div className="employer-task-hero-metric">
                  <span>Ready for Funding</span>
                  <strong>{financeMetrics.readyCount}</strong>
                </div>
                <div className="employer-task-hero-metric">
                  <span>Required Escrow</span>
                  <strong className="text-[#FE9E15]">{usdc(financeMetrics.readyTotal)} USDC</strong>
                </div>
                <div className="employer-task-hero-metric">
                  <span>Reclaimable</span>
                  <strong>{financeMetrics.expiredCount}</strong>
                </div>
              </div>
            </section>

            <main className="employer-task-main">
              {/* Single clean tier of Finance filter tabs */}
              <div className="filter-tabs employer-payroll-filters">
                {financeTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    className={`filter-tab${financeTab === tab.key ? ' active' : ''}`}
                    onClick={() => setFinanceTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {financeTab === 'fund' && (
                <PayrollsTab
                  vault={vault}
                  isHR={false}
                  isFinance={true}
                  initialFilter="draft"
                  hideFilters={true}
                  title="Drafts Awaiting Audit & Funding"
                  eyebrow="Finance Audit"
                />
              )}
              {financeTab === 'all' && (
                <PayrollsTab
                  vault={vault}
                  isHR={false}
                  isFinance={true}
                  initialFilter="all"
                  title="All Vault Payroll Batches"
                  eyebrow="Batch Archive"
                />
              )}
              {financeTab === 'refunds' && <RefundsPanel vault={vault} />}
              {financeTab === 'direct' && roles.HR && (
                <PrepareForm vault={vault} isFinance={true} mode="direct" />
              )}
            </main>
          </div>
        </div>
      ) : active === 'institution' ? (
        /* ═════════ GOVERNANCE & ROLES PORTAL ═════════ */
        <div className="stack dashboard-shell dashboard-shell-employer employer-dashboard-premium employer-dashboard-redesign template-detail-page role-assignment-page">
          <section className="employer-task-hero template-detail-hero">
            <div className="employer-task-hero-copy template-detail-hero-copy">
              <span className="employer-task-kicker">Institution Governance · {company?.name || 'Company'}</span>
              <h1>
                Roles & <span>Policies</span>
              </h1>
              <p className="employer-task-hero-subtitle">
                Manage on-chain role delegations, maker-checker separation, and protocol safety policies.
              </p>
            </div>

            <div className="employer-task-hero-metrics template-detail-hero-metrics" aria-label="Governance summary">
              <div className="employer-task-hero-metric">
                <span>Maker-Checker</span>
                <strong className={separate.enforced ? 'text-[#38d996]' : 'text-[#FE9E15]'}>
                  {separate.enforced ? 'Enforced' : 'Relaxed'}
                </strong>
              </div>
              <div className="employer-task-hero-metric">
                <span>Admin Access</span>
                <strong>{roles.ADMIN ? 'Authorized' : 'Viewer'}</strong>
              </div>
              <div className="employer-task-hero-metric">
                <span>Vault Status</span>
                <strong className="text-[#38d996]">Active</strong>
              </div>
            </div>
          </section>

          <div className="template-detail-layout">
            <main className="template-detail-main">
              <div className="filter-tabs employer-payroll-filters mb-4">
                <button
                  type="button"
                  className={`filter-tab${governanceTab === 'roles' ? ' active' : ''}`}
                  onClick={() => setGovernanceTab('roles')}
                >
                  Role Assignments
                </button>
                <button
                  type="button"
                  className={`filter-tab${governanceTab === 'policies' ? ' active' : ''}`}
                  onClick={() => setGovernanceTab('policies')}
                >
                  Security & Protocol Policies
                </button>
              </div>

              {governanceTab === 'roles' ? (
                <RolesSection vault={vault} isAdmin={roles.ADMIN} />
              ) : (
                <PoliciesSection vault={vault} isAdmin={roles.ADMIN} />
              )}
            </main>

            <aside className="template-detail-sidebar">
              <button
                type="button"
                className="employer-task-primary-action template-detail-sidebar-action-btn"
                onClick={() => setGovernanceTab(governanceTab === 'roles' ? 'policies' : 'roles')}
              >
                {governanceTab === 'roles' ? 'View Safety Policies' : 'Manage Role Delegations'}
              </button>

              <div className="employer-task-card employer-status-sidebar template-detail-sidebar-card">
                <div className="employer-status-sidebar-head">
                  <span className="employer-task-side-icon">
                    <Shield size={14} strokeWidth={1.9} />
                  </span>
                  <div>
                    <span>Governance</span>
                    <strong>Institution Controls</strong>
                  </div>
                </div>

                <div className="employer-status-row">
                  <span>Your Role</span>
                  <strong>{roles.ADMIN ? 'Administrator' : 'Auditor'}</strong>
                </div>
                <div className="employer-status-row">
                  <span>Maker-Checker</span>
                  <strong className={separate.enforced ? 'text-[#38d996]' : 'text-[#FE9E15]'}>
                    {separate.enforced ? 'Enforced' : 'Relaxed'}
                  </strong>
                </div>
                <div className="employer-status-row">
                  <span>Settlement</span>
                  <strong>USDC (Native Gas)</strong>
                </div>
                <div className="employer-status-row">
                  <span>Network</span>
                  <strong className="text-[#38d996]">Circle Arc</strong>
                </div>
              </div>
            </aside>
          </div>
        </div>
      ) : (
        /* ═════════ EMPLOYEE PORTAL (MY PAY) ═════════ */
        <MyPayTab vault={vault} />
      )}
    </div>
  )
}
