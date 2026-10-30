import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
} from 'framer-motion'
import { Lock, KeyRound, Eye, FileCheck2, Shield } from 'lucide-react'
import { SectionHeader } from './SectionHeader'
import { useRef } from 'react'
import { containerFast, itemVariant, VP_TIGHT } from '@/lib/animations'

const FEATURES = [
  { title: 'Maker-checker separation enforces dual-authorization for all payouts', icon: Lock },
  { title: 'Role-based access control built on OpenZeppelin contracts', icon: KeyRound },
  { title: 'Direct USDC settlement without intermediary custody or delay', icon: Eye },
  { title: 'Full transparency: immutable onchain proof of every payroll execution', icon: FileCheck2 },
  { title: 'Circle Arc native execution with gas paid directly in USDC', icon: Shield },
]

export function Security() {
  const ref = useRef(null)

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  const y = useTransform(scrollYProgress, [0, 1], [40, -40])

  const blurValue = useTransform(
    scrollYProgress,
    [0, 1],
    ['blur(6px)', 'blur(2px)']
  )

  const opacityValue = useTransform(scrollYProgress, [0, 1], [0.45, 0.7])

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const smoothX = useSpring(mouseX, { stiffness: 50, damping: 20 })
  const smoothY = useSpring(mouseY, { stiffness: 50, damping: 20 })

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()

    const x = (e.clientX - rect.left - rect.width / 2) / 30
    const y = (e.clientY - rect.top - rect.height / 2) / 30

    mouseX.set(x)
    mouseY.set(y)
  }

  return (
    <section
      ref={ref}
      id="security"
      className="relative overflow-hidden py-24 md:py-32"
    >
      <div className="absolute inset-0 bg-[#0b0b0b]" />

      <div className="relative mx-auto max-w-[1440px] px-6 md:px-8">
        <div className="max-w-xl md:max-w-3xl">
          <SectionHeader
            eyebrow="Security model"
            title={
              <>
                Institutional controls{' '}
                <span className="text-neutral-500">
                  secure, verifiable, and non-custodial.
                </span>
              </>
            }
          />
        </div>

        <motion.div
          style={{ y }}
          onMouseMove={handleMouseMove}
          className="relative mt-12 overflow-hidden rounded-[24px] border border-white/10 md:mt-16"
        >
          <motion.img
            src="/assets/landing/ChatGPT_Image_Apr_25_2026_03_03_40_PM_ilryu3.png"
            alt=""
            onError={(e) => {
              ;(e.currentTarget).src = '/assets/zalarysplash.png'
            }}
            style={{
              x: smoothX,
              y: smoothY,
              filter: blurValue,
              opacity: opacityValue,
            }}
            className="absolute inset-0 h-full w-full scale-[1.1] object-cover"
          />

          <div className="absolute inset-0 bg-black/60" />

          <div
            className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-overlay"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.78' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='.7'/%3E%3C/svg%3E\")",
            }}
          />

          <motion.div
            className="pointer-events-none absolute inset-0"
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            <div className="h-full w-[40%] bg-gradient-to-r from-transparent via-white/10 to-transparent blur-2xl" />
          </motion.div>

          <div className="absolute inset-0 bg-white/[0.04] backdrop-blur-xl" />
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-transparent" />

          <motion.div
            variants={containerFast}
            initial="hidden"
            whileInView="visible"
            viewport={VP_TIGHT}
            className="relative px-6 py-6 md:px-10 md:py-8"
          >
            {FEATURES.map((item, i) => {
              const Icon = item.icon

              return (
                <motion.div
                  key={item.title}
                  variants={itemVariant}
                  whileHover={{ x: 8 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                  className="group relative"
                >
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute left-0 top-0 h-full w-[120px] -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-[250%]" />
                  </div>

                  <div className="relative grid grid-cols-[1fr_auto] items-center gap-5 py-5">
                    <h3 className="text-[0.95rem] font-medium text-neutral-300 transition group-hover:text-white md:text-[1.15rem]">
                      {item.title}
                    </h3>

                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 4 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 md:h-12 md:w-12"
                    >
                      <Icon className="h-5 w-5 text-neutral-300 transition group-hover:text-white md:h-6 md:w-6" />
                    </motion.div>
                  </div>

                  {i !== FEATURES.length - 1 && (
                    <div className="border-b border-dashed border-white/10" />
                  )}
                </motion.div>
              )
            })}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
