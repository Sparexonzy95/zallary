import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion'
import { type MouseEvent, useRef } from 'react'
import {
  containerVariant,
  fadeUpVariant,
  itemVariant,
  VP,
} from '@/lib/animations'

export function FinalCta({ onLaunchApp }: { onLaunchApp: () => void }) {
  const ref = useRef<HTMLDivElement>(null)

  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const smoothX = useSpring(x, { stiffness: 80, damping: 22 })
  const smoothY = useSpring(y, { stiffness: 80, damping: 22 })

  const bgX = useTransform(smoothX, [-200, 200], ['-8%', '8%'])
  const bgY = useTransform(smoothY, [-200, 200], ['-8%', '8%'])

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return

    x.set(e.clientX - rect.left - rect.width / 2)
    y.set(e.clientY - rect.top - rect.height / 2)
  }

  return (
    <section className="relative flex w-full items-center justify-center overflow-hidden bg-[#FE9E15] py-14 md:min-h-[46vh] md:py-0 max-[480px]:items-stretch max-[480px]:py-10">
      <div className="mx-auto w-full max-w-[1100px] px-5 md:px-8 max-[480px]:px-0">
        <motion.div
          ref={ref}
          onMouseMove={handleMouseMove}
          variants={containerVariant}
          initial="hidden"
          whileInView="visible"
          viewport={VP}
          className="relative overflow-hidden rounded-[16px] px-8 py-14 text-black md:px-14 md:py-16 max-[480px]:rounded-none max-[480px]:px-5 max-[480px]:py-10"
        >
          {/* Glow */}
          <motion.div
            style={{ x: bgX, y: bgY }}
            className="pointer-events-none absolute inset-0 opacity-30"
          >
            <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/30 blur-3xl max-[480px]:h-[300px] max-[480px]:w-[300px]" />
          </motion.div>

          <div className="relative z-10 flex items-center justify-between gap-10 max-[480px]:flex-col max-[480px]:items-stretch max-[480px]:justify-center max-[480px]:gap-8">
            {/* LEFT */}
            <div className="max-w-[700px] flex-1 max-[480px]:max-w-full max-[480px]:flex-none">
              <motion.div
                variants={itemVariant}
                className="mb-3 flex items-center gap-2 max-[480px]:mb-4"
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-black/60 max-[480px]:text-[9px] max-[480px]:tracking-[0.18em]">
                  Launch Zalary
                </span>
              </motion.div>

              <motion.h2
                variants={fadeUpVariant}
                className="text-2xl font-bold leading-tight md:text-4xl lg:text-5xl max-[480px]:text-[26px]"
              >
                Run your first onchain payroll.
                <span className="block text-black/75">
                  Audited. Onchain. Instant.
                </span>
              </motion.h2>

              <motion.p
                variants={itemVariant}
                className="mt-5 max-w-[52ch] text-sm leading-relaxed text-black/75 md:text-base"
              >
                Manage salaries and pay your team in USDC with full maker-checker
                governance, executed verifiably on Circle Arc Testnet.
              </motion.p>
            </div>

            {/* RIGHT CTA */}
            <motion.div
              variants={itemVariant}
              className="flex flex-shrink-0 flex-col items-center justify-center gap-3 max-[480px]:w-full max-[480px]:items-stretch"
            >
              <button
                type="button"
                onClick={onLaunchApp}
                className="decrypt-hover-btn inline-flex items-center justify-center gap-2 rounded-lg bg-black px-8 py-4 text-sm font-semibold text-white transition-all hover:bg-black/90 active:scale-95 max-[480px]:w-full"
              >
                Launch App
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M2.5 11.5L11.5 2.5M11.5 2.5H5M11.5 2.5V9"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
