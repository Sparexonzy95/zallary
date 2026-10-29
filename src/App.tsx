import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAccount, useSwitchChain } from 'wagmi'
import { isAddress, type Address } from 'viem'
import { Building2, Plus } from 'lucide-react'
import { CHAIN_ID, CHAIN_NAME } from '@/lib/chain'
import { AddFundsContext } from '@/lib/addFunds'
import { PORTALS, canOpen, defaultPortal, isPortal, type Portal } from '@/lib/portals'
import { useCompanies, useRoles } from '@/hooks/data'
import { Button, Notice } from '@/components/ui'
import { AddFundsSheet } from '@/components/AddFundsSheet'
import { AppShell, type NavItem } from '@/components/AppShell'
import { CompanyView } from '@/components/CompanyView'
import { CreateCompanySheet } from '@/components/CreateCompanySheet'
import { Home } from '@/components/Home'
import { RegisterInstitutionPage } from '@/components/RegisterInstitutionPage'
import { NewLandingPage } from '@/components/zalary/NewLandingPage'
import { DecryptHoverText } from '@/components/DecryptHoverText'

interface Route {
  view: 'landing' | 'app' | 'register'
  vault: Address | null
  portal: Portal | null
}

const readRoute = (): Route => {
  const params = new URLSearchParams(window.location.search)
  const company = params.get('company')
  const portal = params.get('portal')
  const app = params.get('app')
  const register = params.get('register')
  const hasVault = company && isAddress(company)

  if (hasVault) {
    return {
      view: 'app',
      vault: company,
      portal: isPortal(portal) ? portal : null,
    }
  }

  if (register === 'true') {
    return {
      view: 'register',
      vault: null,
      portal: null,
    }
  }

  if (app === 'true') {
    return {
      view: 'app',
      vault: null,
      portal: null,
    }
  }

  return {
    view: 'landing',
    vault: null,
    portal: null,
  }
}

const routeUrl = (route: Route) => {
  if (route.view === 'landing' && !route.vault) return window.location.pathname
  const params = new URLSearchParams()
  if (route.vault) {
    params.set('company', route.vault)
    if (route.portal) params.set('portal', route.portal)
  } else if (route.view === 'register') {
    params.set('register', 'true')
  } else if (route.view === 'app') {
    params.set('app', 'true')
  }
  const str = params.toString()
  return str ? `?${str}` : window.location.pathname
}

export default function App() {
  const { address, chainId, isConnected } = useAccount()
  const { switchChain, isPending } = useSwitchChain()
  const [route, setRoute] = useState<Route>(readRoute)
  const [creating, setCreating] = useState(false)
  const [addingFunds, setAddingFunds] = useState(false)
  const addFunds = useMemo(() => ({ open: () => setAddingFunds(true) }), [])
  const { roles } = useRoles(route.vault ?? undefined, address)
  const companies = useCompanies(address)

  const currentCompany = useMemo(
    () => companies.data?.find((c) => c.vault.toLowerCase() === route.vault?.toLowerCase()),
    [companies.data, route.vault],
  )

  useEffect(() => {
    const onPop = () => setRoute(readRoute())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const go = useCallback((next: Route) => {
    window.history.pushState({}, '', routeUrl(next))
    setRoute(next)
  }, [])

  const nav: NavItem[] = route.vault
    ? [
        ...PORTALS.filter((item) => canOpen(item, roles)).map((item) => ({
          key: item.key,
          label: item.label,
          icon: item.icon,
          active: (route.portal ?? defaultPortal(roles)) === item.key,
          onSelect: () => go({ view: 'app', vault: route.vault, portal: item.key }),
        })),
        {
          key: 'companies',
          label: 'Workspaces',
          icon: Building2,
          active: false,
          onSelect: () => go({ view: 'app', vault: null, portal: null }),
        },
      ]
    : [
        {
          key: 'companies',
          label: 'Workspaces',
          icon: Building2,
          active: route.view !== 'register',
          onSelect: () => go({ view: 'app', vault: null, portal: null }),
        },
        {
          key: 'create_company',
          label: 'Register Institution',
          icon: Plus,
          active: route.view === 'register',
          onSelect: () => go({ view: 'register', vault: null, portal: null }),
        },
      ]

  const wrongChain = isConnected && chainId !== CHAIN_ID

  return (
    <AddFundsContext.Provider value={addFunds}>
      <DecryptHoverText />

      {route.view === 'landing' && !route.vault ? (
        <NewLandingPage
          onLaunchApp={() => go({ view: 'app', vault: null, portal: null })}
          onHome={() => go({ view: 'landing', vault: null, portal: null })}
        />
      ) : (
        <AppShell
          nav={nav}
          heading={currentCompany ? currentCompany.name : 'Zalary'}
          companyName={currentCompany?.name}
          showAddFunds={isConnected}
          onAddFunds={addFunds.open}
          onHome={() => go({ view: 'app', vault: null, portal: null })}
        >
          {wrongChain && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <Notice tone="warn">Your wallet is on another network. Zalary runs on {CHAIN_NAME}.</Notice>
              <Button loading={isPending} onClick={() => switchChain({ chainId: CHAIN_ID })}>
                Switch to {CHAIN_NAME}
              </Button>
            </div>
          )}
          {route.vault ? (
            <CompanyView
              key={route.vault}
              vault={route.vault}
              portal={route.portal}
              onBackToCompanies={() => go({ view: 'app', vault: null, portal: null })}
            />
          ) : route.view === 'register' ? (
            <RegisterInstitutionPage
              onCreated={(vault) => go({ view: 'app', vault, portal: 'institution' })}
              onBack={() => go({ view: 'app', vault: null, portal: null })}
            />
          ) : (
            <Home
              onOpen={(vault) => go({ view: 'app', vault, portal: null })}
              onCreate={() => go({ view: 'register', vault: null, portal: null })}
            />
          )}
        </AppShell>
      )}

      <CreateCompanySheet
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(vault) => go({ view: 'app', vault, portal: 'institution' })}
      />
      <AddFundsSheet open={addingFunds} onClose={() => setAddingFunds(false)} />
    </AddFundsContext.Provider>
  )
}
