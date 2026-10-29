import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  Landmark,
  Lock,
  Plus,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react'
import { useAccount } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import type { Address } from 'viem'
import { useCompanies, type CompanyRow } from '@/hooks/data'
import { FACTORY_ADDRESS } from '@/lib/deployments'
import { ROLE_LABEL, type RoleKey } from '@/lib/roles'
import { formatDate, shortAddress, usdc } from '@/lib/format'
import { Badge, Button, Card, EmptyState, Notice, SectionLabel, Skeleton } from '@/components/ui'

interface Props {
  onOpen: (vault: Address) => void
  onCreate: () => void
}

function RoleBadges({ company }: { company: CompanyRow }) {
  const keys = (Object.keys(company.roles) as RoleKey[]).filter((key) => company.roles[key])
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {keys.map((key) => (
        <Badge key={key} tone={key === 'ADMIN' ? 'info' : 'neutral'}>
          {ROLE_LABEL[key]}
        </Badge>
      ))}
      {company.claimable > 0n && (
        <Badge tone="good">
          {usdc(company.claimable)} USDC claimable
        </Badge>
      )}
    </div>
  )
}

export function Home({ onOpen, onCreate }: Props) {
  const { address, isConnected } = useAccount()
  const companies = useCompanies(address)
  const allCompanies = companies.data ?? []

  const mine = allCompanies.filter(
    (company) =>
      company.creator === address ||
      Object.values(company.roles).some(Boolean) ||
      company.claimable > 0n,
  )

  const totalClaimableAll = mine.reduce((sum, c) => sum + c.claimable, 0n)

  return (
    <div className="relative mx-auto max-w-4xl space-y-10 pb-8">
      {/* Background ambient lighting */}
      <div
        className="glow-orb -top-24 left-1/2 -translate-x-1/2 opacity-70"
        aria-hidden="true"
      />

      {/* ─── Hero Section ─── */}
      <section className="relative pt-4 sm:pt-8 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--inset)] px-3.5 py-1 text-xs font-semibold">
          <Sparkles className="size-3.5 text-[var(--accent)]" />
          <span style={{ color: 'var(--muted)' }}>Institutional Payroll Escrow</span>
          <span className="h-1 w-1 rounded-full bg-[var(--border-strong)]" />
          <span style={{ color: 'var(--accent)' }}>Arc Testnet</span>
        </div>

        <h1 className="display mt-4 text-4xl font-bold tracking-tight text-balance sm:text-6xl sm:leading-[1.1]">
          Institutional payroll in <span className="gradient-text">USDC</span>, built with rigorous controls.
        </h1>

        <p className="mt-4 max-w-2xl text-base text-pretty sm:text-lg leading-relaxed" style={{ color: 'var(--muted)' }}>
          Maker-checker governance for Web3 organizations. HR prepares immutable drafts, Finance audits and funds from treasury, and employees pull payment directly to their wallets.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center sm:justify-start gap-3">
          {isConnected ? (
            <Button onClick={onCreate} disabled={!FACTORY_ADDRESS} className="px-6 py-3">
              <Plus className="size-4" /> Create Company Vault
            </Button>
          ) : (
            <ConnectKitButton.Custom>
              {({ show }) => (
                <Button onClick={show} className="px-6 py-3">
                  <Wallet className="size-4" /> Connect Wallet to Start
                </Button>
              )}
            </ConnectKitButton.Custom>
          )}

          <a
            href="https://faucet.circle.com"
            target="_blank"
            rel="noreferrer"
            className="btn-ghost inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold transition-all hover:bg-white/5 active:scale-[0.98]"
            style={{ color: 'var(--ink-2)', border: '1px solid var(--border)' }}
          >
            Get Test USDC <ArrowRight className="size-3.5" />
          </a>
        </div>

        {!FACTORY_ADDRESS && (
          <div className="mt-5">
            <Notice tone="warn">The company factory is not yet configured for this network.</Notice>
          </div>
        )}
      </section>

      {/* ─── Connected Wallet Overview ─── */}
      {isConnected && FACTORY_ADDRESS && (
        <section aria-label="Your companies" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <SectionLabel>Institutional Portfolio</SectionLabel>
              <h2 className="display text-2xl font-bold">Your Companies</h2>
            </div>
            {mine.length > 0 && (
              <Button variant="ghost" onClick={onCreate} className="!min-h-10 text-xs">
                <Plus className="size-3.5" /> New Company
              </Button>
            )}
          </div>

          {/* Quick Metrics Header if user has companies */}
          {mine.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="inner rounded-2xl p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--subtle)' }}>
                  Active Vaults
                </p>
                <p className="display mt-1 text-2xl font-bold">{mine.length}</p>
              </div>
              <div className="inner rounded-2xl p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--subtle)' }}>
                  Total Claimable
                </p>
                <p className="display mt-1 text-2xl font-bold tabular-nums text-[var(--success)]">
                  {usdc(totalClaimableAll)} <span className="text-xs font-normal text-[var(--muted)]">USDC</span>
                </p>
              </div>
              <div className="inner col-span-2 sm:col-span-1 rounded-2xl p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--subtle)' }}>
                  Settlement Network
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-[var(--success)] animate-pulse" />
                  <span className="text-sm font-semibold">Arc Testnet</span>
                </div>
              </div>
            </div>
          )}

          {companies.isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
            </div>
          )}

          {companies.isError && (
            <Notice tone="bad">Could not query factory contracts on Arc Testnet. Please verify RPC connection.</Notice>
          )}

          {!companies.isLoading && mine.length === 0 && (
            <Card glow className="text-center py-10">
              <EmptyState
                title="No active company vaults"
                body="You haven't created a company yet and your address has not been assigned HR or Finance roles by an employer."
                action={
                  <Button onClick={onCreate} className="mt-4">
                    <Plus className="size-4" /> Create Company Vault
                  </Button>
                }
              />
            </Card>
          )}

          <div className="grid gap-3">
            {mine.map((company) => (
              <button
                key={company.vault}
                onClick={() => onOpen(company.vault)}
                className="glass group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl p-5 text-left transition-all duration-200 hover:border-[var(--border-strong)] hover:scale-[1.003] active:scale-[0.998]"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span className="inner flex size-12 shrink-0 items-center justify-center rounded-xl transition-colors group-hover:border-[var(--accent)]">
                    <Building2 className="size-6 text-[var(--accent)]" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="display truncate text-lg font-bold group-hover:text-[var(--accent)] transition-colors">
                        {company.name}
                      </span>
                      <span className="mono text-xs tabular-nums text-[var(--subtle)]">
                        {shortAddress(company.vault)}
                      </span>
                    </div>
                    <RoleBadges company={company} />
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-[var(--border)] pt-3 sm:border-0 sm:pt-0">
                  <div className="text-left sm:text-right text-xs text-[var(--subtle)]">
                    <span>Est. {formatDate(company.createdAt)}</span>
                  </div>
                  <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--inset)] text-[var(--muted)] group-hover:text-[var(--ink)] group-hover:bg-[var(--accent-dim)] transition-colors">
                    <ChevronRight className="size-4" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ─── Institutional Pillars / Value Prop ─── */}
      <section className="space-y-4 pt-4 border-t border-[var(--border)]">
        <div>
          <SectionLabel>Architecture & Governance</SectionLabel>
          <h2 className="display text-2xl font-bold">Engineered for Corporate Treasury</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-6 space-y-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--accent-dim)] text-[var(--accent)]">
              <Users className="size-5" />
            </div>
            <h3 className="display text-lg font-bold">Maker-Checker Safety</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
              HR drafts salary rosters but cannot move funds. Finance audits drafts and executes disbursement from the corporate wallet.
            </p>
          </Card>

          <Card className="p-6 space-y-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--accent-dim)] text-[var(--accent)]">
              <Lock className="size-5" />
            </div>
            <h3 className="display text-lg font-bold">Direct Pull Escrow</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
              Salaries sit in dedicated, non-custodial company vaults. Employees claim directly to their own wallet whenever they wish.
            </p>
          </Card>

          <Card className="p-6 space-y-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--accent-dim)] text-[var(--accent)]">
              <Landmark className="size-5" />
            </div>
            <h3 className="display text-lg font-bold">Treasury Reclamation</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
              Configurable payroll claim deadlines allow Finance to safely reclaim leftover, unclaimed allocations back to the company treasury.
            </p>
          </Card>
        </div>
      </section>

      {/* ─── Workflow Step-by-Step ─── */}
      <section className="inner rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-[var(--accent)]" />
          <h2 className="display text-xl font-bold">How Institutional Payroll Executes</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <div className="space-y-1.5">
            <span className="mono text-xs font-semibold text-[var(--accent)]">01. DEPLOY</span>
            <p className="font-semibold text-sm">Create Vault</p>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              Deploy an isolated on-chain company escrow with granular role assignments.
            </p>
          </div>

          <div className="space-y-1.5">
            <span className="mono text-xs font-semibold text-[var(--accent)]">02. PREPARE</span>
            <p className="font-semibold text-sm">HR Drafts Batch</p>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              Upload recipients and USDC amounts into an immutable on-chain draft.
            </p>
          </div>

          <div className="space-y-1.5">
            <span className="mono text-xs font-semibold text-[var(--accent)]">03. FUND</span>
            <p className="font-semibold text-sm">Finance Approval</p>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              Finance verifies totals and transfers USDC into vault escrow.
            </p>
          </div>

          <div className="space-y-1.5">
            <span className="mono text-xs font-semibold text-[var(--accent)]">04. SETTLE</span>
            <p className="font-semibold text-sm">Employee Claim</p>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              Employees withdraw directly into their wallet without gas overhead.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Trust Indicators / Protocol Specs ─── */}
      <section className="flex flex-wrap items-center justify-between gap-4 py-4 px-2 border-t border-[var(--border)] text-xs text-[var(--subtle)]">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4 text-[var(--success)]" />
          <span>Solidity 0.8.28 Escrow</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4 text-[var(--success)]" />
          <span>OpenZeppelin AccessControlDefaultAdmin</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4 text-[var(--success)]" />
          <span>Non-custodial per-company architecture</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4 text-[var(--success)]" />
          <span>Canonical USDC settlement</span>
        </div>
      </section>
    </div>
  )
}
