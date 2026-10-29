import React, { useEffect, useState, type ReactNode } from 'react'
import { useAccount, useDisconnect } from 'wagmi'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Menu,
  Plus,
  Wallet,
  X,
  type LucideIcon,
  LogOut,
} from 'lucide-react'
import { ConnectKitButton } from 'connectkit'
import { Button } from '@/components/ui'

const LOGO = '/assets/landing/logo_zalary2_mm8mlp.png'
const DASHBOARD_DECRYPT_CHARS = '01ZALARYARCTESTNET#$%'
const DASHBOARD_DECRYPT_DURATION_MS = 520

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

function decryptLabel(value: string, progress: number, salt: number) {
  const revealCount = Math.floor(value.length * progress)
  const noiseFrame = Math.floor(progress * DASHBOARD_DECRYPT_CHARS.length * 2)

  return Array.from(value)
    .map((char, index) => {
      if (!/[a-z0-9]/i.test(char) || index < revealCount) return char
      return DASHBOARD_DECRYPT_CHARS[
        (index + salt * 3 + noiseFrame) % DASHBOARD_DECRYPT_CHARS.length
      ]
    })
    .join('')
}

function useDecryptLabel(label: string, active: boolean) {
  const [displayLabel, setDisplayLabel] = useState(label)

  useEffect(() => {
    if (!active || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    let animationFrame = 0
    const start = performance.now()
    const salt = label.length

    const renderFrame = (now: number) => {
      const elapsed = now - start
      const linearProgress = Math.min(elapsed / DASHBOARD_DECRYPT_DURATION_MS, 1)
      const easedProgress = 1 - Math.pow(1 - linearProgress, 3)

      setDisplayLabel(decryptLabel(label, easedProgress, salt))

      if (linearProgress < 1) {
        animationFrame = requestAnimationFrame(renderFrame)
      }
    }

    animationFrame = requestAnimationFrame(renderFrame)
    return () => cancelAnimationFrame(animationFrame)
  }, [active, label])

  return active ? displayLabel : label
}

function DecryptNavLabel({ label, active }: { label: string; active: boolean }) {
  const displayLabel = useDecryptLabel(label, active)
  return (
    <span className="sidebar-decrypt-label" aria-label={label}>
      {displayLabel}
    </span>
  )
}

export function AppShell({
  nav,
  showAddFunds,
  onAddFunds,
  onHome,
  onBackToLanding,
  children,
}: Props) {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const shortWallet = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null

  function handleSidebarDoubleClick() {
    if (window.innerWidth <= 768) return
    setSidebarCollapsed((collapsed) => !collapsed)
  }

  return (
    <div className="app-dashboard">
      {/* ─── Mobile overlay ─── */}
      <div
        className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ─── Sidebar ─── */}
      <aside
        className={`app-sidebar${sidebarOpen ? ' open' : ''}${
          sidebarCollapsed ? ' collapsed' : ''
        }`}
        onDoubleClick={handleSidebarDoubleClick}
      >
        <div className="sidebar-brand">
          <button
            type="button"
            className="sidebar-logo"
            onClick={() => {
              onHome()
              setSidebarOpen(false)
            }}
          >
            <img src={LOGO} alt="Zalary" />
          </button>

          <button
            type="button"
            className="sidebar-collapse-toggle"
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            onDoubleClick={(event) => event.stopPropagation()}
            aria-label={sidebarCollapsed ? 'Expand menu' : 'Collapse menu'}
            aria-expanded={!sidebarCollapsed}
            title={sidebarCollapsed ? 'Expand menu' : 'Collapse menu'}
          >
            {sidebarCollapsed ? (
              <ChevronRight size={18} strokeWidth={2} />
            ) : (
              <ChevronLeft size={18} strokeWidth={2} />
            )}
          </button>

          <button
            type="button"
            className="sidebar-mobile-close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>

        <div className="sidebar-divider-h" />

        {onBackToLanding && (
          <div className="px-3 pt-3">
            <button
              type="button"
              onClick={() => {
                onBackToLanding()
                setSidebarOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-xs font-medium text-white/60 transition hover:border-white/10 hover:bg-white/[0.06] hover:text-white"
            >
              <ArrowLeft size={14} />
              {!sidebarCollapsed && <span>Landing Page</span>}
            </button>
          </div>
        )}

        <nav className="sidebar-nav">
          <div className="sidebar-menu-label">Menu</div>

          <div className="sidebar-menu-group">
            {nav.map((item, index) => {
              const Icon = item.icon
              const active = item.active

              return (
                <React.Fragment key={item.key}>
                  {index > 0 && <div className="sidebar-item-divider" />}
                  <button
                    type="button"
                    className={`sidebar-nav-item${active ? ' active' : ''}`}
                    onClick={() => {
                      item.onSelect()
                      setSidebarOpen(false)
                    }}
                  >
                    <div className="sidebar-nav-icon-wrap">
                      <Icon size={18} strokeWidth={1.8} />
                    </div>
                    <DecryptNavLabel label={item.label} active={active} />
                  </button>
                </React.Fragment>
              )
            })}
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-item-divider" />

          <div className="sidebar-profile sidebar-footer-wallet">
            <div className="sidebar-profile-avatar">
              <Wallet size={18} strokeWidth={1.8} />
            </div>
            <div className="sidebar-profile-info">
              <div className="sidebar-profile-name">
                {shortWallet ?? 'Not Connected'}
              </div>
              <div className="flex items-center gap-1.5 pt-0.5">
                <span
                  className={`sidebar-wallet-dot${
                    isConnected ? '' : ' disconnected'
                  }`}
                />
                <span className="sidebar-profile-subtitle">
                  {isConnected ? 'Arc Testnet' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          {isConnected && (
            <>
              <div className="sidebar-item-divider" />
              <button
                type="button"
                className="sidebar-nav-item sidebar-footer-action sidebar-disconnect-btn"
                onClick={() => disconnect()}
              >
                <LogOut size={16} strokeWidth={1.8} />
                <span>Disconnect</span>
              </button>
            </>
          )}
        </div>
      </aside>

      {/* ─── Main Content ─── */}
      <div className="app-content">
        {/* Topbar Header */}
        <header className="flex h-16 items-center justify-between border-b border-white/10 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((open) => !open)}
              className="flex size-10 items-center justify-center rounded-lg border border-white/10 text-white/70 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Toggle menu"
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[11px] text-white/70 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-[#38d996] animate-pulse" />
              Arc Testnet
            </div>
          </div>

          <div className="flex items-center gap-3">
            {showAddFunds && (
              <Button
                variant="ghost"
                onClick={onAddFunds}
                className="!px-3"
                aria-label="Add USDC"
              >
                <Plus className="size-4 text-[#FE9E15]" />{' '}
                <span className="hidden sm:inline">Add USDC</span>
              </Button>
            )}

            <ConnectKitButton />
          </div>
        </header>

        <main className="app-route-decrypt flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
