import { useState } from 'react'
import { useAccount } from 'wagmi'
import type { Address } from 'viem'
import { Building2, Shield } from 'lucide-react'
import { useCompanies, useRoles } from '@/hooks/data'
import { PORTALS, canOpen, defaultPortal, type Portal } from '@/lib/portals'
import { ROLE_LABEL, type RoleKey } from '@/lib/roles'
import { usdc } from '@/lib/format'
import { AddressLink, Badge, Card, Notice, Skeleton } from '@/components/ui'
import { MyPayTab } from '@/components/MyPayTab'
import { PayrollsTab } from '@/components/PayrollsTab'
import { PrepareForm } from '@/components/PrepareForm'
import { RefundsPanel } from '@/components/RefundsPanel'
import { PoliciesSection, RolesSection } from '@/components/TeamTab'
import { Tabs } from '@/components/Tabs'

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
    <div className="space-y-6">
      {/* ─── Institutional Vault Header ─── */}
      <div className="glass rounded-3xl p-6 sm:p-7 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-[var(--accent-dim)] text-[var(--accent)]">
                <Building2 className="size-4" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--subtle)]">
                Company Payroll Vault
              </span>
            </div>

            <h1 className="display text-3xl sm:text-4xl font-bold tracking-tight text-balance">
              {company?.name ?? 'Company Vault'}
            </h1>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <AddressLink address={vault} />
              {myAssignedRoles.map((key) => (
                <Badge key={key} tone={key === 'ADMIN' ? 'info' : 'neutral'}>
                  {ROLE_LABEL[key]}
                </Badge>
              ))}
              {myAssignedRoles.length === 0 && isConnected && (
                <Badge tone="neutral">Employee</Badge>
              )}
            </div>
          </div>

          {/* Quick status box on the right */}
          <div className="inner flex flex-wrap sm:flex-col items-start sm:items-end justify-between gap-2 rounded-2xl p-4 sm:min-w-44">
            <div className="text-left sm:text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--subtle)]">
                Your Claimable Pay
              </p>
              <p className="display text-xl font-bold tabular-nums text-[var(--success)]">
                {company?.claimable ? usdc(company.claimable) : '0.00'} <span className="text-xs font-normal text-[var(--muted)]">USDC</span>
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--subtle)]">
              <span className="size-2 rounded-full bg-[var(--success)]" />
              <span>Live on Arc</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Portal Area Subhead ─── */}
      <div className="px-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <info.icon className="size-5 text-[var(--accent)]" />
            <h2 className="display text-xl font-bold">{info.label}</h2>
          </div>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            {info.blurb}
          </p>
        </div>

        {info.role && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--subtle)]">
            <Shield className="size-3.5 text-[var(--muted)]" />
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
          <div className="flex size-12 items-center justify-center rounded-full bg-[var(--danger-dim)] text-[var(--danger)] mx-auto mb-3">
            <Shield className="size-6" />
          </div>
          <h3 className="display text-lg font-bold">Access Restricted</h3>
          <p className="mt-1 text-sm max-w-md mx-auto text-pretty" style={{ color: 'var(--muted)' }}>
            Your connected wallet does not hold the {info.role ? ROLE_LABEL[info.role] : ''} role required to view or execute actions in this section.
          </p>
        </Card>
      ) : active === 'hr' ? (
        <PayrollsTab vault={vault} isHR={roles.HR} isFinance={false} showPrepare title="HR Payroll Drafts & Batches" />
      ) : active === 'finance' ? (
        <div className="space-y-5">
          <Tabs tabs={financeTabs} value={financeTab} onChange={setFinanceTab} />
          {financeTab === 'fund' && <PayrollsTab vault={vault} isHR={false} isFinance title="Pending & Funded Payrolls" />}
          {financeTab === 'refunds' && <RefundsPanel vault={vault} />}
          {financeTab === 'onestep' && roles.HR && <PrepareForm vault={vault} isFinance mode="direct" />}
        </div>
      ) : active === 'institution' ? (
        <div className="space-y-5">
          <Tabs
            tabs={[
              { key: 'roles', label: 'Role Assignments' },
              { key: 'policies', label: 'Security & Protocol Policies' },
            ]}
            value={governanceTab}
            onChange={setGovernanceTab}
          />
          {governanceTab === 'roles' ? <RolesSection vault={vault} isAdmin={roles.ADMIN} /> : <PoliciesSection vault={vault} isAdmin={roles.ADMIN} />}
        </div>
      ) : (
        <MyPayTab vault={vault} />
      )}
    </div>
  )
}
