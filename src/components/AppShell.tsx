import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ConnectKitButton } from 'connectkit'
import { ArrowLeft, Menu, Plus, X, type LucideIcon } from 'lucide-react'
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
  onBackToLanding?: () => void
  children: ReactNode
}

function NavList({
  nav,
  heading,
  onPick,
  onBackToLanding,
}: {
  nav: NavItem[]
  heading?: string
  onPick?: () => void
  onBackToLanding?: () => void
}) {
  return (
    <nav aria-label="Main" className="space-y-1">
      {onBackToLanding && (
        <button
          type="button"
          onClick={() => {
            onBackToLanding()
            onPick?.()
          }}
          className="group mb-3 flex min-h-10 w-full items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.03] px-3 text-left text-xs font-medium text-white/60 transition hover:border-white/10 hover:bg-white/[0.06] hover:text-white"
        >
          <ArrowLeft className="size-3.5 transition group-hover:-translate-x-0.5" />
          <span>Back to Landing</span>
        </button>
      )}

      {heading && (
        <p className="px-3 pb-2 pt-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
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
          className="group flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition-all duration-200"
          style={
            item.active
              ? { background: 'rgba(254, 158, 21, 0.12)', color: '#FE9E15' }
              : { color: 'rgba(255, 255, 255, 0.7)' }
          }
        >
          <span
            className="flex size-8 items-center justify-center rounded-md transition-colors"
            style={
              item.active
                ? { background: 'rgba(254, 158, 21, 0.16)' }
                : { background: 'transparent' }
            }
          >
            <item.icon className="size-4 shrink-0" />
          </span>
          <span className="truncate">{item.label}</span>
          {item.active && (
            <span
              className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: '#FE9E15' }}
            />
          )}
        </button>
      ))}
    </nav>
  )
}

function Logo({ onHome }: { onHome: () => void }) {
  return (
    <button
      type="button"
      onClick={onHome}
      className="flex items-center gap-2.5 transition hover:opacity-90"
      aria-label="Zalary home"
    >
      <img
        src="/assets/landing/logo_zalary2_mm8mlp.png"
        alt="Zalary"
        className="h-7 w-auto object-contain"
      />
      <div className="hidden flex-col items-start leading-none sm:flex">
        <span className="font-mono text-[10px] uppercase tracking-wider text-[#FE9E15]">
          Arc Payroll
        </span>
      </div>
    </button>
  )
}

export function AppShell({
  nav,
  heading,
  showAddFunds,
  onAddFunds,
  onHome,
  onBackToLanding,
  children,
}: Props) {
  const [drawer, setDrawer] = useState(false)

  useEffect(() => {
    if (!drawer) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setDrawer(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawer])

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* ─── Topbar ─── */}
      <header
        className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-white/10 px-4 sm:px-6"
        style={{
          background: 'rgba(8, 8, 8, 0.88)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDrawer(true)}
            aria-label="Open menu"
            className="flex size-10 items-center justify-center rounded-lg border border-white/10 text-white/70 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
          >
            <Menu className="size-5" />
          </button>
          <Logo onHome={onHome} />
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[11px] text-white/70 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[#38d996] animate-pulse" />
            Arc Testnet
          </div>

          {showAddFunds && (
            <Button variant="ghost" onClick={onAddFunds} className="!px-3" aria-label="Add USDC">
              <Plus className="size-4 text-[#FE9E15]" /> <span className="hidden sm:inline">Add USDC</span>
            </Button>
          )}

          <ConnectKitButton />
        </div>
      </header>

      {/* ─── Desktop layout ─── */}
      <div className="mx-auto flex max-w-7xl">
        <aside
          className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-64 shrink-0 overflow-y-auto border-r border-white/10 p-5 lg:block"
        >
          <NavList
            nav={nav}
            heading={heading}
            onBackToLanding={onBackToLanding}
          />
        </aside>
        <main className="min-w-0 flex-1 px-4 pb-28 pt-6 sm:px-8 lg:px-10">{children}</main>
      </div>

      {/* ─── Mobile drawer ─── */}
      <AnimatePresence>
        {drawer && (
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDrawer(false)}
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.aside
              role="dialog"
              aria-label="Menu"
              className="absolute inset-y-0 left-0 flex flex-col gap-5 overflow-y-auto border-r border-white/10 bg-[#121212] p-5"
              style={{ width: 'min(300px, 86vw)' }}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <Logo onHome={() => { onHome(); setDrawer(false); }} />
                <button
                  onClick={() => setDrawer(false)}
                  aria-label="Close menu"
                  className="flex size-9 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="size-5" />
                </button>
              </div>
              <NavList
                nav={nav}
                heading={heading}
                onPick={() => setDrawer(false)}
                onBackToLanding={onBackToLanding}
              />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
