import { motion } from 'framer-motion'
import {
  containerVariant,
  containerFast,
  fadeUpVariant,
  fadeLeftVariant,
  fadeRightVariant,
  itemVariant,
  VP,
} from '@/lib/animations'

const EMPLOYER_IMAGE = '/assets/zalaryemployer.png'
const EMPLOYEE_IMAGE = '/assets/zalaryemployee.png'

function FeatureBlock({
  eyebrow,
  title,
  subtitle,
  features,
  cta,
  image,
  reverse = false,
  id,
  bg,
  onCta,
}: {
  eyebrow: string
  title: string
  subtitle: string
  features: string[]
  cta: string
  image: string
  reverse?: boolean
  id: string
  bg: string
  onCta: () => void
}) {
  const copyVariant = reverse ? fadeRightVariant : fadeLeftVariant
  const imageVariant = reverse ? fadeLeftVariant : fadeRightVariant

  return (
    <section id={id} style={{ backgroundColor: bg }} className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <div
          className={[
            'flex flex-col gap-10 sm:gap-12 lg:flex-row lg:items-center lg:gap-16',
            reverse ? 'lg:flex-row-reverse' : '',
          ].join(' ')}
        >
          {/* Copy column */}
          <motion.div
            variants={copyVariant}
            initial="hidden"
            whileInView="visible"
            viewport={VP}
            className="flex-1"
          >
            <motion.div variants={containerVariant}>
              <motion.span
                variants={itemVariant}
                className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-primary"
              >
                {eyebrow}
              </motion.span>

              <motion.h2
                variants={fadeUpVariant}
                className="mt-4 font-display text-[22px] font-bold leading-[1.1] tracking-[-0.025em] text-foreground sm:text-[28px] md:text-[36px]"
              >
                {title}
              </motion.h2>

              {subtitle && (
                <motion.p
                  variants={itemVariant}
                  className="mt-4 text-[15px] leading-relaxed text-muted-foreground"
                >
                  {subtitle}
                </motion.p>
              )}

              <motion.ul variants={containerFast} className="mt-8 space-y-2.5">
                {features.map((feature) => (
                  <motion.li
                    key={feature}
                    variants={itemVariant}
                    className="flex items-center gap-3 text-[14px] text-foreground/70"
                  >
                    <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                    {feature}
                  </motion.li>
                ))}
              </motion.ul>

              <motion.div variants={itemVariant} className="mt-8">
                <button
                  type="button"
                  onClick={onCta}
                  className="decrypt-hover-btn inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 active:opacity-75"
                >
                  {cta}
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2.5 6h7m0 0L6 2.5M9.5 6L6 9.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Image column */}
          <motion.div
            variants={imageVariant}
            initial="hidden"
            whileInView="visible"
            viewport={VP}
            className="flex-[1.4]"
          >
            <img
              src={image}
              alt={`${title} preview`}
              className="block w-full object-contain drop-shadow-2xl rounded-xl border border-white/5"
              width={1920}
              height={1080}
              loading="lazy"
              onError={(e) => {
                ;(e.currentTarget).src = '/assets/zalarydash.png'
              }}
            />
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export function EmployerSection({ onLaunchApp }: { onLaunchApp: () => void }) {
  return (
    <FeatureBlock
      id="employers"
      bg="#101010"
      eyebrow="For employers"
      title="Build payroll once. Run it repeatedly with privacy and control."
      subtitle="Maker-checker governance separating HR preparation from Finance funding."
      features={[
        'Create reusable company vaults on Arc Testnet',
        'Configure employees, roles and salary allocations',
        'Schedule recurring payroll drafts with strict maker-checker controls',
        'Direct USDC funding from company treasury',
        'Transparent multi-role execution and refund safeguards',
        'Track payroll runs, active states, and audit trails',
      ]}
      cta="Start as Employer"
      image={EMPLOYER_IMAGE}
      onCta={onLaunchApp}
    />
  )
}

export function EmployeeSection({ onLaunchApp }: { onLaunchApp: () => void }) {
  return (
    <FeatureBlock
      id="employees"
      bg="#0c0c0c"
      reverse
      eyebrow="For employees"
      title="Claim what is yours, without exposing what stays private."
      subtitle="Direct onchain salary claims paid in native USDC."
      features={[
        'View claimable payroll across all enrolled companies',
        'One-click USDC claim directly to your wallet',
        'No intermediaries or custodial delays',
        'Real-time transaction confirmation and receipts',
        'Instant liquidity on Circle Arc Testnet',
        'Complete privacy of personal payroll history',
      ]}
      cta="Continue as Employee"
      image={EMPLOYEE_IMAGE}
      onCta={onLaunchApp}
    />
  )
}
