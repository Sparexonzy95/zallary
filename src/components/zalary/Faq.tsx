import { useState } from 'react'
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion'

const CATEGORIES = ['General', 'Payment', 'Security', 'Governance'] as const
type Category = (typeof CATEGORIES)[number]

const FAQS: { category: Category; q: string; a: string }[] = [
  {
    category: 'General',
    q: 'What is Zalary and who is it built for?',
    a: 'Zalary is an institutional onchain payroll protocol designed for modern teams, DAOs, and globally distributed organizations on Circle Arc. It allows operators to manage payroll with dual-approval maker-checker governance while keeping sensitive compensation flows protected.',
  },
  {
    category: 'General',
    q: 'What makes Zalary different from traditional payroll systems?',
    a: 'Traditional payroll systems rely on centralized intermediaries, slow wire settlements, and custodial risk. Zalary coordinates payroll through smart contracts on Circle Arc with instant USDC finalization directly to employee wallets.',
  },
  {
    category: 'General',
    q: 'How does Zalary fit into an existing workflow?',
    a: 'HR managers create drafts with employee lists and compensation amounts, while Finance leads review, audit, and fund the drafts from the institutional treasury. Employees claim their USDC anytime.',
  },
  {
    category: 'General',
    q: 'Is Zalary only for crypto-native teams?',
    a: 'No. Any company with global contributors can fund payroll in USDC or on-ramp directly from fiat using cards or bank accounts via Circle test integrations.',
  },
  {
    category: 'Payment',
    q: 'What assets can be used for payroll?',
    a: 'Zalary runs natively on Circle Arc where gas is paid directly in USDC. All payroll amounts and claims settle in USDC.',
  },
  {
    category: 'Payment',
    q: 'How are payroll funds managed?',
    a: 'Funds are held in non-custodial company escrow vaults governed by smart contracts. Unclaimed or canceled funds can be refunded back to the Finance treasury.',
  },
  {
    category: 'Payment',
    q: 'Can employees withdraw funds easily?',
    a: 'Yes, employees pull claimable USDC straight into their Web3 wallets with a single transaction.',
  },
  {
    category: 'Payment',
    q: 'Are payouts instant?',
    a: 'Yes, once a payroll run is funded by Finance, claims are immediately available to employees onchain.',
  },
  {
    category: 'Security',
    q: 'How secure is Zalary?',
    a: 'Zalary is built on OpenZeppelin smart contracts, which are widely audited, with role-based access control (Admin, HR, Finance, Employee) and an optional rule that a different person must approve each payroll. The Zalary contracts themselves have had an internal security review but not yet an independent third-party audit.',
  },
  {
    category: 'Security',
    q: 'Is the payroll process fully onchain?',
    a: 'Yes, company registration, role assignments, draft approvals, funding, and employee claims are executed verifiably onchain on Circle Arc.',
  },
  {
    category: 'Security',
    q: 'What prevents errors in payroll execution?',
    a: 'Maker-checker controls prevent single-point failures: HR cannot fund drafts, and Finance cannot alter employee allocations without creating a revised draft.',
  },
  {
    category: 'Security',
    q: 'Can transactions be verified onchain?',
    a: 'Yes, every vault creation, funding transaction, and salary claim has an immutable transaction hash viewable on the Circle Arc block explorer.',
  },
  {
    category: 'Governance',
    q: 'How does maker-checker segregation work in Zalary?',
    a: 'Zalary enforces strict separation of duties: HR managers can only prepare immutable payroll drafts with recipient rosters, while distinct Finance officers audit and fund the escrow. This prevents rogue disbursements and institutional fraud.',
  },
  {
    category: 'Governance',
    q: 'What happens to unclaimed employee salaries?',
    a: 'Each payroll batch has a configurable expiration deadline. Once expired, any remaining uncollected USDC can be reclaimed directly back into the company treasury by the Finance officer.',
  },
  {
    category: 'Governance',
    q: 'Can organizations assign multiple admins or officers?',
    a: 'Yes. Company vaults leverage OpenZeppelin role-based access control (AccessControl). Institution admins can add, revoke, or reassign HR and Finance roles dynamically.',
  },
]

function FaqItem({
  faq,
  isOpen,
  onToggle,
  x,
  y,
  springX,
  springY,
}: {
  faq: { q: string; a: string }
  isOpen: boolean
  onToggle: () => void
  x: MotionValue<number>
  y: MotionValue<number>
  springX: MotionValue<number>
  springY: MotionValue<number>
}) {
  const rotateX = useTransform(y, [-50, 50], [4, -4])
  const rotateY = useTransform(x, [-50, 50], [-4, 4])

  return (
    <motion.div
      layout
      style={{
        rotateX,
        rotateY,
        transformPerspective: 900,
      }}
      whileHover={{ scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      className="relative min-w-0 overflow-hidden rounded-[8px] border border-white/10 bg-white/[0.03]"
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full min-w-0 items-start justify-between gap-4 px-5 py-5 text-left transition hover:bg-white/[0.02]"
      >
        <span className="min-w-0 leading-snug text-white/90">{faq.q}</span>
        <span className="shrink-0 text-white/50">{isOpen ? '−' : '+'}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 120,
              damping: 22,
            }}
            className="px-5 pb-5 text-sm leading-relaxed text-white/60"
          >
            {faq.a}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        style={{ x: springX, y: springY }}
        className="pointer-events-none absolute inset-0"
      />
    </motion.div>
  )
}

export function Faq() {
  const [activeCategory, setActiveCategory] = useState<Category>('General')
  const [openQuestion, setOpenQuestion] = useState<string | null>(null)

  const filtered = FAQS.filter((f) => f.category === activeCategory)

  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const springX = useSpring(x, { stiffness: 120, damping: 20 })
  const springY = useSpring(y, { stiffness: 120, damping: 20 })

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const relX = e.clientX - rect.left - rect.width / 2
    const relY = e.clientY - rect.top - rect.height / 2
    x.set(relX * 0.05)
    y.set(relY * 0.05)
  }

  return (
    <section id="faq" className="relative overflow-hidden bg-[#141414] py-20 sm:py-24">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 right-[-10%] h-[60vh] w-[45vw] bg-black/50 blur-[160px]" />
        <div className="absolute bottom-0 left-[-10%] h-[40vh] w-[35vw] bg-black/40 blur-[140px]" />
      </div>

      <motion.div
        className="mx-auto w-full max-w-[820px] min-w-0 px-4"
        onMouseMove={handleMouseMove}
        initial={{ opacity: 0, scale: 0.97, y: 30 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-white leading-[1.08]">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="mb-10 flex justify-center">
          <div className="flex rounded-full border border-white/10 bg-white/[0.04] p-1 backdrop-blur-md">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat

              return (
                <button
                  type="button"
                  key={cat}
                  onClick={() => {
                    setActiveCategory(cat)
                    setOpenQuestion(null)
                  }}
                  className="relative px-4 py-1.5 text-[11px] uppercase tracking-widest"
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-pill"
                      className="absolute inset-0 rounded-full border border-white/15 bg-white/10"
                      transition={{
                        type: 'spring',
                        stiffness: 300,
                        damping: 30,
                      }}
                    />
                  )}

                  <span
                    className={`relative z-10 transition ${
                      isActive ? 'text-white' : 'text-white/45'
                    }`}
                  >
                    {cat}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="min-w-0 space-y-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-w-0 space-y-3"
            >
              {filtered.map((faq) => (
                <FaqItem
                  key={faq.q}
                  faq={faq}
                  isOpen={openQuestion === faq.q}
                  onToggle={() => setOpenQuestion(openQuestion === faq.q ? null : faq.q)}
                  x={x}
                  y={y}
                  springX={springX}
                  springY={springY}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </section>
  )
}
