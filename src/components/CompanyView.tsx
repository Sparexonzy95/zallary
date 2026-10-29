import { useState } from 'react'
import { useAccount } from 'wagmi'
import type { Address } from 'viem'
import { useCompanies, useRoles } from '@/hooks/data'
import { PORTALS, canOpen, defaultPortal, type Portal } from '@/lib/portals'
import { ROLE_LABEL, type RoleKey } from '@/lib/roles'
import { AddressLink, Badge, Notice, Skeleton } from '@/components/ui'
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
    { key: 'fund', label: 'Review and fund' },
    { key: 'refunds', label: 'Refunds' },
    ...(roles.HR ? [{ key: 'onestep' as const, label: 'Create and fund' }] : []),
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="display text-3xl font-bold text-balance">{company?.name ?? 'Company'}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <AddressLink address={vault} />
          {(Object.keys(roles) as RoleKey[])
            .filter((key) => roles[key])
            .map((key) => (
              <Badge key={key} tone={key === 'ADMIN' ? 'info' : 'neutral'}>
                {ROLE_LABEL[key]}
              </Badge>
            ))}
        </div>
      </div>

      <div>
        <h2 className="display text-xl font-semibold">{info.label}</h2>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          {info.blurb}
        </p>
      </div>

      {!isConnected && <Notice tone="info">Connect your wallet to see your role in this company.</Notice>}

      {isLoading ? (
        <Skeleton className="h-48" />
      ) : !allowed ? (
        <Notice tone="warn">Your wallet does not have the {info.role ? ROLE_LABEL[info.role] : ''} role in this company, so this area is closed.</Notice>
      ) : active === 'hr' ? (
        <PayrollsTab vault={vault} isHR={roles.HR} isFinance={false} showPrepare title="Drafts and history" />
      ) : active === 'finance' ? (
        <div className="space-y-5">
          <Tabs tabs={financeTabs} value={financeTab} onChange={setFinanceTab} />
          {financeTab === 'fund' && <PayrollsTab vault={vault} isHR={false} isFinance title="Payrolls" />}
          {financeTab === 'refunds' && <RefundsPanel vault={vault} />}
          {financeTab === 'onestep' && roles.HR && <PrepareForm vault={vault} isFinance mode="direct" />}
        </div>
      ) : active === 'institution' ? (
        <div className="space-y-5">
          <Tabs
            tabs={[
              { key: 'roles', label: 'Roles' },
              { key: 'policies', label: 'Policies and safety' },
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
