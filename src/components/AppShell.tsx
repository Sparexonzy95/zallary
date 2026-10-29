import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ConnectKitButton } from 'connectkit'
import { Building2, Menu, Plus, X, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui'

export interface NavItem {
  key: string
  label: string
  icon: LucideIcon
  active: boolean
  onSelect: () => void
}

interface Props {
  nav: NavItem[]
  heading?: string
  showAddFunds: boolean
  onAddFunds: () => void
  onHome: () => void
  children: ReactNode
}

function NavList({ nav, heading, onPick }: { nav: NavItem[]; heading?: string; onPick?: () => void }) {
  return (
    <nav aria-label="Main" className="space-y-1">
      {heading && (
        <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--subtle)' }}>
          {heading}
        </p>
      )}
      {nav.map((item) => (
        <button
          key={item.key}
          onClick={() => {
            item.onSelect()
            onPick?.()
          }}
          aria-current={item.active ? 'page' : undefined}
          className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold transition-colors"
          style={
            item.active
              ? { background: 'rgba(254,158,21,0.12)', color: 'var(--accent)' }
              : { color: 'var(--ink-2)' }
          }
        >
          <item.icon className="size-4 shrink-0" />
          <span className="truncate">{item.label}</span>
        </button>
      ))}
    </nav>
  )
}

export function AppShell({ nav, heading, showAddFunds, onAddFunds, onHome, children }: Props) {
  const [drawer, setDrawer] = useState(false)

  useEffect(() => {
    if (!drawer) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setDrawer(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawer])

  return (
    <div className="min-h-dvh">
      <header
        className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b px-3 sm:px-5"
        style={{ background: 'rgba(8,8,8,0.92)', backdropFilter: 'blur(12px)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDrawer(true)}
            aria-label="Open menu"
            className="flex size-11 items-center justify-center rounded-xl hover:bg-white/10 lg:hidden"
          >
            <Menu className="size-5" />
          </button>
          <button onClick={onHome} className="display flex min-h-11 items-center gap-2 text-lg font-bold" aria-label="Zalary home">
            <span className="flex size-8 items-center justify-center rounded-xl text-sm" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>
              Z
            </span>
            Zalary
          </button>
        </div>
        <div className="flex items-center gap-2">
          {showAddFunds && (
            <Button variant="ghost" onClick={onAddFunds} className="!px-3" aria-label="Add USDC">
              <Plus className="size-4" /> <span className="hidden sm:inline">Add USDC</span>
            </Button>
          )}
          <ConnectKitButton />
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl">
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-64 shrink-0 overflow-y-auto border-r p-4 lg:block" style={{ borderColor: 'var(--border)' }}>
          <NavList nav={nav} heading={heading} />
        </aside>
        <main className="min-w-0 flex-1 px-4 pb-28 pt-6 sm:px-6">{children}</main>
      </div>

      <AnimatePresence>
        {drawer && (
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDrawer(false)}
          >
            <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.75)' }} />
            <motion.aside
              role="dialog"
              aria-label="Menu"
              className="absolute inset-y-0 left-0 flex flex-col gap-4 overflow-y-auto border-r p-4"
              style={{ width: 'min(300px, 86vw)', background: 'var(--elevated)', borderColor: 'var(--border)' }}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <span className="display flex items-center gap-2 text-lg font-bold">
                  <Building2 className="size-5" style={{ color: 'var(--accent)' }} /> Menu
                </span>
                <button onClick={() => setDrawer(false)} aria-label="Close menu" className="flex size-11 items-center justify-center rounded-xl hover:bg-white/10">
                  <X className="size-5" />
                </button>
              </div>
              <NavList nav={nav} heading={heading} onPick={() => setDrawer(false)} />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
