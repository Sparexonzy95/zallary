import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { ConnectKitButton } from 'connectkit'
import { useAccount } from 'wagmi'
import { AnnouncementBar } from './AnnouncementBar'

const RESOURCES = [
  { label: 'Documentation', href: 'https://docs.zalary.xyz' },
  { label: 'Circle Faucet', href: 'https://faucet.circle.com' },
  { label: 'Arc Explorer', href: 'https://testnet.arcscan.io' },
]

const NAV_LINKS = [
  { label: 'How It Works', href: '#how' },
  { label: 'For Employers', href: '#employers' },
  { label: 'For Employees', href: '#employees' },
  { label: 'Security', href: '#security' },
  { label: 'FAQ', href: '#faq' },
]

const ANNOUNCEMENT_MESSAGE = 'UPDATE: USDC NOW SUPPORTED ON ARC TESTNET'

const mobileMenuContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, duration: 0.2 },
  },
  exit: { opacity: 0 },
}

const mobileItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 260, damping: 22 },
  },
}

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

      <div className="relative border-b border-white/10 bg-black/50 backdrop-blur-xl">
        <nav className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-6 md:px-12">
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
                className="transition hover:text-white"
              >
                Resources ▾
              </button>

              {resourcesOpen && (
                <div className="absolute top-full mt-3 w-52 rounded-xl border border-white/10 bg-black/90 p-2 shadow-2xl backdrop-blur-2xl">
                  {RESOURCES.map((resource) => (
                    <a
                      key={resource.label}
                      href={resource.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg px-3 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
                      onClick={() => setResourcesOpen(false)}
                    >
                      {resource.label}
                    </a>
                  ))}
                </div>
              )}
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

          {/* DESKTOP CTA */}
          <div className="hidden items-center gap-4 md:flex">
            <ConnectKitButton.Custom>
              {({ isConnected: connected, show, truncatedAddress }) => (
                <button
                  type="button"
                  onClick={show}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 font-mono text-xs font-medium text-white transition hover:bg-white/10"
                >
                  {connected ? truncatedAddress : 'Connect'}
                </button>
              )}
            </ConnectKitButton.Custom>

            <button
              type="button"
              onClick={onLaunchApp}
              className="decrypt-hover-btn rounded-full bg-[#FE9E15] px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-[#FE9E15]/90 hover:scale-[1.02] active:scale-95"
            >
              {isConnected ? 'Open App' : 'Launch App'}
            </button>
          </div>

          {/* MOBILE TOGGLE */}
          <button
            type="button"
            onClick={() => setMobileOpen((value) => !value)}
            className="relative z-50 flex h-10 w-10 items-center justify-center lg:hidden"
            aria-label="menu toggle"
            aria-expanded={mobileOpen}
          >
            <div className="relative flex h-6 w-6 items-center justify-center">
              <motion.span
                className="absolute h-[2px] w-6 bg-white"
                animate={{
                  rotate: mobileOpen ? 45 : 0,
                  y: mobileOpen ? 0 : -6,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              />
              <motion.span
                className="absolute h-[2px] w-6 bg-white"
                animate={{
                  opacity: mobileOpen ? 0 : 1,
                  scaleX: mobileOpen ? 0 : 1,
                }}
              />
              <motion.span
                className="absolute h-[2px] w-6 bg-white"
                animate={{
                  rotate: mobileOpen ? -45 : 0,
                  y: mobileOpen ? 0 : 6,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              />
            </div>
          </button>
        </nav>
      </div>

      {/* MOBILE MENU */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            variants={mobileMenuContainer}
            initial="hidden"
            animate="show"
            exit="exit"
            className="fixed inset-0 top-20 z-40 flex flex-col bg-black/95 px-6 py-8 backdrop-blur-2xl lg:hidden"
          >
            <div className="flex flex-col gap-5 text-lg font-medium text-white">
              {NAV_LINKS.map((link) => (
                <motion.a
                  key={link.label}
                  variants={mobileItem}
                  href={link.href}
                  onClick={closeMobileMenu}
                  className="py-2 text-white/80 transition hover:text-white"
                >
                  {link.label}
                </motion.a>
              ))}

              <div className="my-2 border-t border-white/10" />

              <motion.button
                variants={mobileItem}
                type="button"
                onClick={() => {
                  closeMobileMenu()
                  onLaunchApp()
                }}
                className="w-full rounded-xl bg-[#FE9E15] py-3.5 text-center text-sm font-semibold text-black"
              >
                Launch App
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
