import { Building2, ChevronRight, Plus } from 'lucide-react'
import { useAccount } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import type { Address } from 'viem'
import { useCompanies, type CompanyRow } from '@/hooks/data'
import { FACTORY_ADDRESS } from '@/lib/deployments'
import { ROLE_LABEL, type RoleKey } from '@/lib/roles'
import { usdc } from '@/lib/format'
import { Badge, Button, Card, EmptyState, Notice, Skeleton } from '@/components/ui'

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
      {company.claimable > 0n && <Badge tone="good">{usdc(company.claimable)} USDC to claim</Badge>}
    </div>
  )
}

export function Home({ onOpen, onCreate }: Props) {
  const { address, isConnected } = useAccount()
  const companies = useCompanies(address)
  const mine = (companies.data ?? []).filter(
    (company) => company.creator === address || Object.values(company.roles).some(Boolean) || company.claimable > 0n,
  )

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Card className="!p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--muted)' }}>
          Institutional payroll
        </p>
        <h1 className="display mt-2 text-4xl font-bold text-balance sm:text-5xl">Pay your team in USDC, with proper controls.</h1>
        <p className="mt-3 max-w-xl text-pretty" style={{ color: 'var(--ink-2)' }}>
          Create a company, give HR and Finance their roles, and let employees claim their pay straight to their wallet.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {isConnected ? (
            <Button onClick={onCreate} disabled={!FACTORY_ADDRESS}>
              <Plus className="size-4" /> Create a company
            </Button>
          ) : (
            <ConnectKitButton.Custom>
              {({ show }) => <Button onClick={show}>Connect wallet to start</Button>}
            </ConnectKitButton.Custom>
          )}
        </div>
        {!FACTORY_ADDRESS && (
          <div className="mt-4">
            <Notice tone="warn">The company factory has not been deployed to Arc Testnet yet, so companies cannot be created.</Notice>
          </div>
        )}
      </Card>

      {isConnected && FACTORY_ADDRESS && (
        <section aria-label="Your companies" className="space-y-3">
          <h2 className="display px-1 text-xl font-semibold">Your companies</h2>
          {companies.isLoading && (
            <>
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </>
          )}
          {companies.isError && <Notice tone="bad">Could not load companies. Check your connection and try again.</Notice>}
          {!companies.isLoading && mine.length === 0 && (
            <EmptyState
              title="No companies yet"
              body="Create your first company, or ask your employer to add your wallet as HR, Finance or an employee."
              action={
                <Button onClick={onCreate} className="mt-2">
                  <Plus className="size-4" /> Create a company
                </Button>
              }
            />
          )}
          {mine.map((company) => (
            <button
              key={company.vault}
              onClick={() => onOpen(company.vault)}
              className="glass flex min-h-20 w-full items-center gap-4 rounded-3xl p-4 text-left transition-transform hover:scale-[1.005]"
            >
              <span className="inner flex size-11 shrink-0 items-center justify-center rounded-2xl">
                <Building2 className="size-5" />
              </span>
              <span className="min-w-0 flex-1 space-y-1.5">
                <span className="display block truncate text-lg font-semibold">{company.name}</span>
                <RoleBadges company={company} />
              </span>
              <ChevronRight className="size-5 shrink-0" style={{ color: 'var(--subtle)' }} />
            </button>
          ))}
        </section>
      )}
    </div>
  )
}
