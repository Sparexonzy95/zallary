import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ChevronDown, Menu, X } from 'lucide-react'
import { ConnectKitButton } from 'connectkit'
import { useAccount } from 'wagmi'
import { WalletBoldIcon } from '@/components/icons'
import { AnnouncementBar } from './AnnouncementBar'

const RESOURCES = [
  { label: 'Documentation', href: '#' },
  { label: 'Circle Faucet', href: '#' },
  { label: 'Arc Explorer', href: '#' },
]

const NAV_LINKS = [
  { label: 'How It Works', href: '#how' },
  { label: 'For Employers', href: '#employers' },
  { label: 'For Employees', href: '#employees' },
  { label: 'Security', href: '#security' },
  { label: 'FAQ', href: '#faq' },
]

const ANNOUNCEMENT_MESSAGE = 'UPDATE: USDC NATIVELY SUPPORTED ON CIRCLE ARC'

interface NavbarProps {
  onLaunchApp: () => void
  onHome?: () => void
}

export function Navbar({ onLaunchApp, onHome }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [resourcesOpen, setResourcesOpen] = useState(false)
  const [announcementVisible, setAnnouncementVisible] = useState(true)
  const { isConnected } = useAccount()

  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileOpen(false)
        setResourcesOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setResourcesOpen(false)
      }
    }

    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function closeMobileMenu() {
    setMobileOpen(false)
  }

  return (
    <header className="fixed top-0 z-50 w-full transition-all">
      <AnimatePresence>
        {announcementVisible && (
          <AnnouncementBar
            message={ANNOUNCEMENT_MESSAGE}
            onClose={() => setAnnouncementVisible(false)}
          />
        )}
      </AnimatePresence>

      <div className="relative border-b border-white/10 bg-black/60 backdrop-blur-xl">
        <nav className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-5 sm:px-6 md:px-12">
          {/* LOGO */}
          <button
            type="button"
            onClick={onHome ?? onLaunchApp}
            className="flex items-center gap-3 transition hover:opacity-90"
            aria-label="Go to Zalary home"
          >
            <img
              src="/assets/landing/logo_zalary2_mm8mlp.png"
              alt="Zalary"
              className="h-7 w-auto object-contain"
            />
          </button>

          {/* DESKTOP NAV */}
          <div className="hidden items-center gap-8 text-sm text-white/70 lg:flex">
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setResourcesOpen((value) => !value)}
                className="flex items-center gap-1.5 transition hover:text-white"
                aria-expanded={resourcesOpen}
              >
                <span>Resources</span>
                <ChevronDown className={`size-3.5 transition-transform duration-200 ${resourcesOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {resourcesOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.18 }}
                    className="absolute top-full mt-3 w-52 rounded-xl border border-white/10 bg-[#151515] p-1.5 shadow-2xl backdrop-blur-2xl"
                  >
                    {RESOURCES.map((resource) => (
                      <a
                        key={resource.label}
                        href={resource.href}
                        className="block rounded-lg px-3 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
                        onClick={() => setResourcesOpen(false)}
                      >
                        {resource.label}
                      </a>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="transition hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* ACTIONS & MOBILE TOGGLE */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ConnectKitButton.Custom>
              {({ isConnected: connected, show, truncatedAddress }) => (
                <button
                  type="button"
                  onClick={show}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-white/10 bg-[#161616] hover:bg-[#202020] px-3 sm:px-4 py-2 font-mono text-xs font-medium text-white transition-colors"
                  title={connected ? "Connected wallet — click to view options" : "Connect wallet"}
                >
                  <WalletBoldIcon width={15} height={15} className="text-[#FE9E15]" />
                  <span>{connected ? truncatedAddress : 'Connect'}</span>
                </button>
              )}
            </ConnectKitButton.Custom>

            <button
              type="button"
              onClick={onLaunchApp}
              className="hidden sm:inline-flex decrypt-hover-btn min-h-10 items-center rounded-full bg-[#FE9E15] px-5 py-2 text-xs font-semibold text-black transition hover:bg-[#FE9E15]/90 hover:scale-[1.02] active:scale-95"
            >
              {isConnected ? 'Open App' : 'Launch App'}
            </button>

            {/* MOBILE MENU TOGGLE (min 44x44px target) */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-[#151515] text-white transition hover:bg-white/10 active:scale-95 lg:hidden"
              aria-label="Open navigation menu"
              aria-expanded={mobileOpen}
            >
              <Menu className="size-5" />
            </button>
          </div>
        </nav>
      </div>

      {/* FULL-HEIGHT MOBILE OVERLAY DRAWER (ckash Architecture) */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-label="Mobile navigation"
            aria-modal="true"
            className="fixed inset-0 z-[70] max-h-[100dvh] overflow-y-auto overscroll-contain bg-[#050505] text-white lg:hidden"
          >
            <div className="relative z-10 flex min-h-full flex-col px-6 py-6">
              {/* DRAWER HEADER */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    closeMobileMenu()
                    if (onHome) onHome()
                    else onLaunchApp()
                  }}
                  className="flex items-center gap-2"
                >
                  <img
                    src="/assets/landing/logo_zalary2_mm8mlp.png"
                    alt="Zalary"
                    className="h-7 w-auto object-contain"
                  />
                </button>

                <button
                  type="button"
                  onClick={closeMobileMenu}
                  aria-label="Close navigation menu"
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-[#151515] text-white hover:bg-white/10 active:scale-95"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* NAV SECTIONS */}
              <div className="mt-8 space-y-8 flex-1">
                {/* PRODUCT LINKS */}
                <div>
                  <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-[#FE9E15]">
                    Explore Product
                  </p>
                  <div className="space-y-1">
                    {NAV_LINKS.map((link) => (
                      <a
                        key={link.label}
                        href={link.href}
                        onClick={closeMobileMenu}
                        className="group flex min-h-12 items-center justify-between rounded-xl px-4 py-3 text-[16px] font-medium text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white"
                      >
                        <span>{link.label}</span>
                        <ArrowRight className="size-4 text-white/30 transition-transform group-hover:translate-x-1 group-hover:text-[#FE9E15]" />
                      </a>
                    ))}
                  </div>
                </div>

                {/* RESOURCES */}
                <div>
                  <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-white/40">
                    Resources & Network
                  </p>
                  <div className="space-y-1">
                    {RESOURCES.map((resource) => (
                      <a
                        key={resource.label}
                        href={resource.href}
                        onClick={closeMobileMenu}
                        className="group flex min-h-11 items-center justify-between rounded-xl px-4 py-2.5 text-[14px] text-white/60 transition-colors hover:bg-white/[0.04] hover:text-white"
                      >
                        <span>{resource.label}</span>
                        <ArrowRight className="size-3.5 text-white/20 transition-transform group-hover:translate-x-1 group-hover:text-white" />
                      </a>
                    ))}
                  </div>
                </div>

                {/* CALL TO ACTION BUTTONS */}
                <div className="pt-4 space-y-3">
                  <ConnectKitButton.Custom>
                    {({ isConnected: connected, show, truncatedAddress }) => (
                      <button
                        type="button"
                        onClick={show}
                        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-[#151515] font-mono text-sm font-semibold text-white transition hover:bg-[#202020]"
                      >
                        <WalletBoldIcon width={16} height={16} className="text-[#FE9E15]" />
                        <span>{connected ? `Connected: ${truncatedAddress}` : 'Connect Wallet'}</span>
                      </button>
                    )}
                  </ConnectKitButton.Custom>

                  <button
                    type="button"
                    onClick={() => {
                      closeMobileMenu()
                      onLaunchApp()
                    }}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#FE9E15] text-sm font-semibold text-black transition hover:bg-[#FE9E15]/90 active:scale-98"
                  >
                    <span>{isConnected ? 'Open App Workspace' : 'Launch Zalary App'}</span>
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              </div>

              {/* DRAWER FOOTER */}
              <div className="mt-8 border-t border-white/10 pt-5 text-center">
                <p className="text-xs text-white/45 leading-relaxed">
                  Institutional payroll infrastructure on Circle Arc.
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-white/30">
                  Native USDC Escrow · Non-Custodial
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
