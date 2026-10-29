import { useState } from 'react'
import { useAccount } from 'wagmi'
import type { Address } from 'viem'
import { Shield } from 'lucide-react'
import { useCompanies, useRoles } from '@/hooks/data'
import { PORTALS, canOpen, defaultPortal, type Portal } from '@/lib/portals'
import { ROLE_LABEL, type RoleKey } from '@/lib/roles'
import { shortAddress, usdc } from '@/lib/format'
import { AddressLink, Card, Notice, Skeleton } from '@/components/ui'
import { MyPayTab } from '@/components/MyPayTab'
import { PayrollsTab } from '@/components/PayrollsTab'
import { PrepareForm } from '@/components/PrepareForm'
import { RefundsPanel } from '@/components/RefundsPanel'
import { PoliciesSection, RolesSection } from '@/components/TeamTab'

interface Props {
  vault: Address
  portal: Portal | null
}

type FinanceTab = 'fund' | 'refunds' | 'onestep'
type GovernanceTab = 'roles' | 'policies'

export function CompanyView({ vault, portal }: Props) {
  const { address, isConnected } = useAccount()
  const companies = useCompanies(address)
  const { roles, isLoading } = useRoles(vault, address)
  const company = companies.data?.find((c) => c.vault.toLowerCase() === vault.toLowerCase())
  const [financeTab, setFinanceTab] = useState<FinanceTab>('fund')
  const [governanceTab, setGovernanceTab] = useState<GovernanceTab>('roles')

  const active = portal ?? defaultPortal(roles)
  const info = PORTALS.find((item) => item.key === active) ?? PORTALS[2]
  const allowed = canOpen(info, roles)

  const financeTabs: { key: FinanceTab; label: string }[] = [
    { key: 'fund', label: 'Review & Fund' },
    { key: 'refunds', label: 'Treasury Refunds' },
    ...(roles.HR ? [{ key: 'onestep' as const, label: 'Create & Fund (Direct)' }] : []),
  ]

  const myAssignedRoles = (Object.keys(roles) as RoleKey[]).filter((key) => roles[key])

  return (
    <div className="stack dashboard-shell dashboard-shell-employer employer-dashboard-premium employer-dashboard-redesign template-detail-page institution-workspace-page space-y-6">
      {/* ─── Institutional Vault Hero ─── */}
      <section className="employer-task-hero template-detail-hero">
        <div className="employer-task-hero-copy template-detail-hero-copy">
          <span className="employer-task-kicker">Company Payroll Vault</span>
          <h1>{company?.name ?? 'Company Workspace'}</h1>
          <p className="employer-task-hero-subtitle">
            Connected as {shortAddress(address ?? '')} on Circle Arc Testnet.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <AddressLink address={vault} />
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

        <div className="employer-task-hero-metrics template-detail-hero-metrics" aria-label="Vault summary">
          <div className="employer-task-hero-metric">
            <span>Vault Address</span>
            <strong>{shortAddress(vault)}</strong>
          </div>
          <div className="employer-task-hero-metric">
            <span>Your Claimable</span>
            <strong className="text-[#38d996]">
              {company?.claimable ? usdc(company.claimable) : '0.00'} USDC
            </strong>
          </div>
        </div>
      </section>

      {/* ─── Portal Area Subhead ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div>
          <div className="flex items-center gap-2">
            <info.icon className="size-5 text-[#FE9E15]" />
            <h2 className="text-xl font-bold font-display text-white">{info.label}</h2>
          </div>
          <p className="text-sm text-white/50 mt-0.5">
            {info.blurb}
          </p>
        </div>

        {info.role && (
          <div className="flex items-center gap-1.5 text-xs text-white/40 font-mono">
            <Shield className="size-3.5 text-[#FE9E15]" />
            <span>Requires {ROLE_LABEL[info.role]} authorization</span>
          </div>
        )}
      </div>

      {!isConnected && (
        <Notice tone="info">Connect your wallet to verify authorization and access company controls.</Notice>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-64 rounded-3xl" />
        </div>
      ) : !allowed ? (
        <Card className="py-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-red-500/10 text-red-500 mx-auto mb-3">
            <Shield className="size-6" />
          </div>
          <h3 className="text-lg font-bold font-display">Access Restricted</h3>
          <p className="mt-1 text-sm max-w-md mx-auto text-white/50">
            Your connected wallet does not hold the {info.role ? ROLE_LABEL[info.role] : ''} role required to view or execute actions in this section.
          </p>
        </Card>
      ) : active === 'hr' ? (
        <PayrollsTab vault={vault} isHR={roles.HR} isFinance={false} showPrepare title="HR Payroll Drafts & Batches" />
      ) : active === 'finance' ? (
        <div className="space-y-5">
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
          {financeTab === 'fund' && <PayrollsTab vault={vault} isHR={false} isFinance title="Pending & Funded Payrolls" />}
          {financeTab === 'refunds' && <RefundsPanel vault={vault} />}
          {financeTab === 'onestep' && roles.HR && <PrepareForm vault={vault} isFinance mode="direct" />}
        </div>
      ) : active === 'institution' ? (
        <div className="space-y-5">
          <div className="filter-tabs employer-payroll-filters">
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
          {governanceTab === 'roles' ? <RolesSection vault={vault} isAdmin={roles.ADMIN} /> : <PoliciesSection vault={vault} isAdmin={roles.ADMIN} />}
        </div>
      ) : (
        <MyPayTab vault={vault} />
      )}
    </div>
  )
}
