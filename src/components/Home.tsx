import { useState, useMemo } from 'react'
import {
  ArrowRight,
  Building2,
  Plus,
  Search,
} from 'lucide-react'
import { useAccount } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import type { Address } from 'viem'
import { useCompanies } from '@/hooks/data'
import { FACTORY_ADDRESS } from '@/lib/deployments'
import { formatDate, shortAddress, usdc } from '@/lib/format'
import { EmptyState, Notice, Skeleton } from '@/components/ui'

interface Props {
  onOpen: (vault: Address) => void
  onCreate: () => void
}

export function Home({ onOpen, onCreate }: Props) {
  const { address, isConnected } = useAccount()
  const companies = useCompanies(address)
  const allCompanies = useMemo(() => companies.data ?? [], [companies.data])

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'mine' | 'claimable'>('all')

  const mine = useMemo(
    () =>
      allCompanies.filter(
        (company) =>
          company.creator === address ||
          Object.values(company.roles).some(Boolean) ||
          company.claimable > 0n,
      ),
    [allCompanies, address],
  )

  const totalClaimableAll = useMemo(
    () => mine.reduce((sum, c) => sum + c.claimable, 0n),
    [mine],
  )

  const filteredCompanies = useMemo(() => {
    const list = filter === 'mine' ? mine : filter === 'claimable' ? allCompanies.filter(c => c.claimable > 0n) : allCompanies
    const query = search.trim().toLowerCase()
    if (!query) return list
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.vault.toLowerCase().includes(query),
    )
  }, [allCompanies, mine, filter, search])

  const filterOptions = [
    { value: 'all' as const, label: `All (${allCompanies.length})` },
    { value: 'mine' as const, label: `Your Companies (${mine.length})` },
    { value: 'claimable' as const, label: 'Claimable' },
  ]

  return (
    <div className="stack dashboard-shell dashboard-shell-employer employer-dashboard-premium employer-dashboard-redesign">
      <div className="employer-task-dashboard">
        {/* ─── Hero Header ─── */}
        <section className="employer-task-hero">
          <div className="employer-task-hero-copy">
            <span className="employer-task-kicker">Workspaces</span>
            <h1>
              Institution <span>Vaults</span>
            </h1>
            <p className="employer-task-hero-subtitle">
              Manage corporate payroll vaults, maker-checker delegations, and USDC settlements on Circle Arc.
            </p>
          </div>

          <div className="employer-task-hero-metrics" aria-label="Portfolio summary">
            <div className="employer-task-hero-metric">
              <span>Active Institutions</span>
              <strong>{allCompanies.length}</strong>
            </div>
            <div className="employer-task-hero-metric">
              <span>Your Claimable</span>
              <strong>{usdc(totalClaimableAll)} USDC</strong>
            </div>
          </div>

          <div className="employer-task-actions">
            {isConnected ? (
              <button
                type="button"
                onClick={onCreate}
                disabled={!FACTORY_ADDRESS}
                className="employer-task-primary-action"
              >
                <Plus size={15} strokeWidth={2} />
                Register Institution
              </button>
            ) : (
              <ConnectKitButton.Custom>
                {({ show }) => (
                  <button
                    type="button"
                    onClick={show}
                    className="employer-task-primary-action"
                  >
                    Connect Wallet
                  </button>
                )}
              </ConnectKitButton.Custom>
            )}
          </div>
        </section>

        {/* ─── Main Content ─── */}
        <main className="employer-task-main">
          <section className="employer-task-card employer-payroll-board">
            <div className="employer-task-card-head">
              <div>
                <span>Workspaces</span>
                <h2>Institution Directory</h2>
              </div>
              <span className="employer-task-count">
                {filteredCompanies.length} item{filteredCompanies.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="employer-payroll-toolbar employer-task-toolbar">
              <label className="employer-payroll-search employer-task-search">
                <Search size={15} strokeWidth={2} />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search institutions by name or address..."
                />
              </label>

              <div className="employer-payroll-filter-area employer-task-filter-area w-full overflow-x-auto overflow-y-hidden">
                <div className="filter-tabs employer-payroll-filters employer-task-filters flex items-center gap-1.5 flex-nowrap w-max">
                  {filterOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`filter-tab shrink-0 whitespace-nowrap${filter === option.value ? ' active' : ''}`}
                      onClick={() => setFilter(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {companies.isLoading ? (
              <div className="space-y-3 p-4">
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
              </div>
            ) : companies.isError ? (
              <div className="p-4">
                <Notice tone="bad">
                  Could not query factory contracts on Circle Arc. Please verify RPC connection.
                </Notice>
              </div>
            ) : filteredCompanies.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title={search ? 'No matching companies' : 'No company vaults found'}
                  body={
                    search
                      ? 'Try adjusting your search query or filter.'
                      : 'Deploy your first institutional company vault on Circle Arc to get started.'
                  }
                  action={
                    isConnected && (
                      <button
                        type="button"
                        onClick={onCreate}
                        className="btn btn-primary mt-4"
                      >
                        <Plus className="mr-2 size-4" /> Register Institution Vault
                      </button>
                    )
                  }
                />
              </div>
            ) : (
              <div className="employer-task-payroll-list">
                {filteredCompanies.map((company) => (
                  <button
                    key={company.vault}
                    type="button"
                    onClick={() => onOpen(company.vault)}
                    className="employer-task-payroll-row"
                  >
                    <span className="employer-task-row-copy">
                      <strong>{company.name}</strong>
                      <span className="font-mono text-xs text-white/50">
                        {shortAddress(company.vault)} · Est. {formatDate(company.createdAt)}
                      </span>
                    </span>

                    <span className="employer-task-view-link">Open Vault</span>
                    <ArrowRight size={16} strokeWidth={2} />
                  </button>
                ))}
              </div>
            )}
          </section>
        </main>

        {/* ─── Sidebar ─── */}
        <aside className="employer-task-side">
          {isConnected && (
            <button
              type="button"
              onClick={onCreate}
              className="employer-task-primary-action employer-sidebar-new-payroll"
            >
              <Plus size={15} strokeWidth={2} />
              Register Institution
            </button>
          )}

          <div className="employer-task-card employer-status-sidebar">
            <div className="employer-status-sidebar-head">
              <span className="employer-task-side-icon">
                <Building2 size={14} strokeWidth={1.9} />
              </span>
              <div>
                <span>Vault Status</span>
                <strong>{allCompanies.length} deployed</strong>
              </div>
            </div>

            <div className="employer-status-row">
              <span>Your Vaults</span>
              <strong>{mine.length}</strong>
            </div>
            <div className="employer-status-row">
              <span>Network</span>
              <strong className="text-[#38d996]">Circle Arc</strong>
            </div>
            <div className="employer-status-row">
              <span>Token</span>
              <strong>USDC (Native Gas)</strong>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
