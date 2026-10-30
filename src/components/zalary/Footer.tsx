import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { ArrowRight, Mail } from 'lucide-react'

const XLogo = ({ size = 18, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M18.244 2H21.5l-7.6 8.66L22 22h-6.5l-5.1-6.7L4.5 22H1.25l8.1-9.2L2 2h6.7l4.6 6.1L18.244 2Zm-1.13 18h1.8L6.3 3.9H4.4L17.114 20Z" />
  </svg>
)

const footerLinks = [
  {
    title: 'Product',
    items: [
      { label: 'How It Works', href: '#how' },
      { label: 'For Employers', href: '#employers' },
      { label: 'For Employees', href: '#employees' },
      { label: 'Security', href: '#security' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  {
    title: 'Company',
    items: [
      { label: 'About Us', href: '#' },
      { label: 'Docs', href: '#' },
      { label: 'Circle Arc', href: '#' },
    ],
  },
  {
    title: 'Support',
    items: [
      { label: 'Help Center', href: '#' },
      { label: 'Circle Faucet', href: '#' },
      { label: 'Explorer', href: '#' },
    ],
  },
  {
    title: 'Legal',
    items: [
      { label: 'Terms of Use', href: '#' },
      { label: 'Privacy Policy', href: '#' },
      { label: 'Security Disclosures', href: '#' },
    ],
  },
]

const socials = [
  {
    icon: <Mail size={18} />,
    label: 'Email',
    href: '#',
  },
  {
    icon: <XLogo size={18} />,
    label: 'X',
    href: '#',
  },
]

export function Footer({ onLaunchApp }: { onLaunchApp: () => void }) {
  const ref = useRef<HTMLElement | null>(null)

  const isInView = useInView(ref, {
    once: true,
    margin: '-100px',
  })

  return (
    <footer
      ref={ref}
      className="relative overflow-hidden border-t border-white/10 bg-black text-white"
    >
      {/* Background Logo */}
      <div className="pointer-events-none absolute inset-0 -z-30">
        <img
          src="/assets/landing/ZALARY_LOGO_SVG_6_jr0b0u.svg"
          alt="Background"
          className="h-full w-full scale-125 object-contain opacity-[0.05] blur-sm"
        />
      </div>

      {/* Glow Overlay */}
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_center,_rgba(255,170,0,0.08),_transparent_55%)]" />

      {/* Grain Texture */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage: "url('/assets/landing/asfalt-dark.png')",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.9, ease: 'easeOut' }}
        className="relative z-10 mx-auto max-w-[1440px] px-6 py-16 md:px-10 lg:px-14"
      >
        {/* Top CTA */}
        <div className="mb-14 overflow-hidden rounded-[20px] border border-white/15 bg-white/[0.06] shadow-2xl backdrop-blur-3xl">
          <div className="relative grid items-center gap-10 p-8 md:p-12 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <p className="text-xs uppercase tracking-[0.35em] text-white/45">
                  Institutional payroll on Arc
                </p>
              </div>

              <Mail
                size={240}
                className="pointer-events-none absolute right-8 top-1/2 hidden -translate-y-1/2 text-white/5 lg:block"
              />

              <h2 className="text-3xl font-semibold leading-tight md:text-5xl lg:text-6xl">
                Let’s connect and build
                <br />
                <span className="block text-white/60">
                  the right payroll solution.
                </span>
              </h2>

              <p className="mt-5 max-w-[620px] text-sm leading-relaxed text-white/55 md:text-base">
                Speak with our team about institutional payroll, seamless employee
                payouts, and enterprise maker-checker operations. We’re here to help
                you launch faster and scale smarter.
              </p>
            </div>

            <a
              href="#"
              aria-label="Email Zalary team"
              className="decrypt-hover-btn group flex h-20 w-20 items-center justify-center rounded-full border border-white/15 bg-[#FE9E15] text-black transition-all duration-300 hover:scale-105"
            >
              <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
            </a>
          </div>
        </div>

        {/* Community CTA Card */}
        <div className="mb-14 overflow-hidden rounded-[20px] border border-white/30 bg-white/90 text-black shadow-2xl backdrop-blur-3xl">
          <div className="relative grid items-center gap-10 p-8 md:p-12 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <p className="text-xs uppercase tracking-[0.35em] text-black/50">
                  Join our community
                </p>
              </div>

              <XLogo
                size={240}
                className="pointer-events-none absolute right-8 top-1/2 hidden -translate-y-1/2 text-black/5 lg:block"
              />

              <h2 className="text-3xl font-semibold leading-tight md:text-5xl lg:text-6xl">
                Follow the conversation
                <span className="block text-black/60">on X.</span>
              </h2>

              <p className="mt-5 max-w-[620px] text-sm leading-relaxed text-black/60 md:text-base">
                Stay updated with product releases, payroll insights, team
                updates, and the future of institutional payroll on Arc.
              </p>
            </div>

            <a
              href="#"
              className="decrypt-hover-btn group flex h-20 w-20 items-center justify-center rounded-full border border-black/10 bg-neutral-200 text-black transition-all duration-300 hover:scale-105"
              aria-label="Visit Zalary on X"
            >
              <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
            </a>
          </div>
        </div>

        {/* Main Footer Grid */}
        <div className="grid gap-12 border-y border-white/10 py-14 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <h3 className="max-w-[320px] text-3xl font-semibold leading-tight md:text-4xl">
              Payroll infrastructure for high-performance companies.
            </h3>

            <button
              type="button"
              onClick={onLaunchApp}
              className="decrypt-hover-btn mt-8 inline-flex items-center gap-2 rounded-full bg-[#FE9E15] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[#FE9E15]/90"
            >
              Launch App
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
            {footerLinks.map((group) => (
              <div key={group.title}>
                <h4 className="mb-5 text-xs font-medium uppercase tracking-[0.25em] text-white/35">
                  {group.title}
                </h4>

                <ul className="space-y-3 text-sm text-white/65">
                  {group.items.map((item) => (
                    <li key={`${group.title}-${item.label}`}>
                      <a
                        href={item.href}
                        className="transition hover:text-white"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}

                  {group.title === 'Product' && (
                    <li>
                      <button
                        type="button"
                        onClick={onLaunchApp}
                        className="text-left text-sm text-white/65 transition hover:text-white"
                      >
                        Launch App
                      </button>
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Row */}
        <div className="flex flex-col gap-8 pt-10 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            {socials.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target={social.href.startsWith('http') ? '_blank' : undefined}
                rel={
                  social.href.startsWith('http')
                    ? 'noopener noreferrer'
                    : undefined
                }
                className="group flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/70 transition-all duration-300 hover:border-white/20 hover:text-white"
                aria-label={social.label}
              >
                <span className="transition-transform duration-300 group-hover:scale-110">
                  {social.icon}
                </span>
              </a>
            ))}
          </div>

          <div className="text-left md:text-right">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/35">
              © 2026 Zalary. Built on Circle Arc.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Full-width wordmark at the very bottom */}
      <div className="w-full overflow-hidden">
        <img
          src="/assets/landing/ZALARY_LOGO_SVG_3_half_cdjkqt.svg"
          alt="Zalary"
          className="pointer-events-none mx-auto block w-[90vw] select-none"
          draggable={false}
        />
      </div>
    </footer>
  )
}
