import React, { useEffect, useState, type ReactNode } from 'react'
import { useAccount, useDisconnect } from 'wagmi'
import {
  Building2,
  Menu,
  Plus,
  X,
  type LucideIcon,
} from 'lucide-react'
import { ConnectKitButton } from 'connectkit'
import { Button } from '@/components/ui'
import {
  CollapseIcon,
  ExpandIcon,
  LogoutBoldIcon,
  WalletBoldIcon,
} from '@/components/icons'

const LOGO = '/assets/landing/logo_zalary2_mm8mlp.png'
const DASHBOARD_DECRYPT_CHARS = '01ZALARYARC#$%'
const DASHBOARD_DECRYPT_DURATION_MS = 520

export interface NavItem {
  key: string
  label: string
  shortLabel?: string
  icon: LucideIcon
  active: boolean
  onSelect: () => void
}

interface Props {
  nav: NavItem[]
  heading?: string
  companyName?: string
  showAddFunds: boolean
  onAddFunds: () => void
  onHome: () => void
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
  companyName,
  showAddFunds,
  onAddFunds,
  onHome,
  children,
}: Props) {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const shortWallet = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [sidebarOpen])

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
              <ExpandIcon width={18} height={18} />
            ) : (
              <CollapseIcon width={18} height={18} />
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

        {companyName && (
          <div className="px-3 pt-3">
            <div className="rounded-xl border border-white/5 bg-white/[0.03] p-2.5 flex items-center justify-between">
              <div className="min-w-0 flex items-center gap-2">
                <Building2 className="size-4 text-[#FE9E15] shrink-0" />
                {!sidebarCollapsed && (
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-white/40 block">Workspace</span>
                    <strong className="text-xs font-semibold text-white truncate block">{companyName}</strong>
                  </div>
                )}
              </div>
              {!sidebarCollapsed && (
                <button
                  type="button"
                  onClick={onHome}
                  className="text-[11px] text-[#FE9E15] hover:underline shrink-0 ml-1 font-mono"
                  title="Switch Company"
                >
                  Switch
                </button>
              )}
            </div>
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
              <WalletBoldIcon width={18} height={18} />
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
                  {isConnected ? 'Circle Arc' : 'Offline'}
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
                <LogoutBoldIcon width={18} height={18} />
                <span>Disconnect</span>
              </button>
            </>
          )}
        </div>
      </aside>

      {/* ─── Main Content ─── */}
      <div className="app-content">
        {/* Mobile topbar (shown on small screens <= 768px via .app-mobile-topbar) */}
        <div className="app-mobile-topbar">
          <button
            type="button"
            onClick={onHome}
            className="inline-flex items-center"
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <img src={LOGO} alt="Zalary" style={{ maxHeight: '24px', width: 'auto', objectFit: 'contain' }} />
          </button>
          <div className="flex items-center gap-2">
            <ConnectKitButton.Custom>
              {({ isConnected: connected, show, truncatedAddress }) => (
                <button
                  type="button"
                  onClick={show}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#161616] hover:bg-[#202020] px-3 py-1.5 text-xs font-mono font-medium text-white transition-colors cursor-pointer"
                  title={connected ? "Connected wallet — click to view options" : "Connect wallet"}
                >
                  <WalletBoldIcon width={15} height={15} className="text-[#FE9E15]" />
                  <span>{connected ? truncatedAddress : 'Connect'}</span>
                </button>
              )}
            </ConnectKitButton.Custom>
            <button
              type="button"
              onClick={() => setSidebarOpen((open) => !open)}
              className="mobile-menu-toggle"
              aria-label="Toggle menu"
            >
              {sidebarOpen ? <X size={18} strokeWidth={1.8} /> : <Menu size={18} strokeWidth={1.8} />}
            </button>
          </div>
        </div>

        {/* Desktop topbar header */}
        <header className="topbar hidden md:flex">
          <div className="flex items-center gap-3">
            {/* Network pill removed per user request */}
          </div>

          <div className="topbar-right">
            {showAddFunds && (
              <Button
                variant="secondary"
                onClick={onAddFunds}
                className="btn btn-sm btn-subtle flex items-center gap-1.5 !min-h-9"
                aria-label="Add USDC"
              >
                <Plus size={14} className="text-[#FE9E15]" />
                <span>Add USDC</span>
              </Button>
            )}

            <ConnectKitButton.Custom>
              {({ isConnected: connected, show, truncatedAddress }) => (
                <button
                  type="button"
                  onClick={show}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#161616] hover:bg-[#202020] hover:border-white/20 px-3.5 py-1.5 text-xs font-mono font-medium text-white transition-colors cursor-pointer"
                  title={connected ? "Connected wallet — click to view options" : "Connect wallet"}
                >
                  <WalletBoldIcon width={16} height={16} className="text-[#FE9E15]" />
                  <span>{connected ? truncatedAddress : 'Connect Wallet'}</span>
                </button>
              )}
            </ConnectKitButton.Custom>
          </div>
        </header>

        <main className="app-route-decrypt flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>

        {/* ─── Flipit-Style Mobile Bottom Navigation Tabs (Strictly hidden on desktop via .mobile-nav) ─── */}
        {nav.length > 0 && (
          <nav className="mobile-nav" aria-label="Mobile Navigation">
            {nav.map((item) => {
              const Icon = item.icon
              const active = item.active

              return (
                <button
                  key={item.key}
                  type="button"
                  className={active ? 'active' : ''}
                  onClick={() => {
                    item.onSelect()
                    setSidebarOpen(false)
                  }}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                  <span>{item.shortLabel ?? item.label}</span>
                </button>
              )
            })}
          </nav>
        )}
      </div>
    </div>
  )
}
