import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  containerVariant,
  containerFast,
  fadeUpVariant,
  itemVariant,
  cardVariant,
  VP,
  VP_TIGHT,
} from '@/lib/animations'

const CARDS = [
  {
    id: 1,
    title: 'Institutional Payroll',
    subtitle:
      'Non-custodial smart vaults, segregated maker-checker governance, and immutable batch execution for enterprise organizations.',
    image:
      '/assets/landing/ChatGPT_Image_Apr_25_2026_03_10_18_PM_2_wrk37z.png',
  },
  {
    id: 2,
    title: 'Native USDC Settlement',
    subtitle:
      'Direct Circle USDC settlement on Arc Testnet ensuring zero price slippage, rapid confirmation, and low gas overhead.',
    image:
      '/assets/landing/ChatGPT_Image_Apr_25_2026_03_08_13_PM_rnob9m.png',
  },
  {
    id: 3,
    title: 'Maker-Checker Controls',
    subtitle:
      'Separation of duties: HR drafts rosters and allocations, while authorized Finance officers audit and fund the escrow.',
    image:
      '/assets/landing/ChatGPT_Image_Apr_25_2026_03_10_18_PM_4_qwh5d9.png',
  },
  {
    id: 4,
    title: 'Employee Claims',
    subtitle:
      'Employees discover claimable payroll runs, connect their Web3 wallet, and claim their earnings with a single on-chain transaction.',
    image:
      '/assets/landing/ChatGPT_Image_Apr_25_2026_03_10_18_PM_1_mmlxip.png',
  },
  {
    id: 5,
    title: 'Treasury Reclaims',
    subtitle:
      'Automated expiration deadlines protect company funds, allowing seamless reclaim of expired balances back to company reserves.',
    image:
      '/assets/landing/ChatGPT_Image_May_29_2026_07_56_31_PM_iflszb.png',
  },
]

export function ProductOverview() {
  const [activeCard, setActiveCard] = useState(1)

  return (
    <section className="relative overflow-hidden bg-[#09090B] py-16 md:py-24 lg:py-28">
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[400px] w-[400px] md:h-[500px] md:w-[500px] -translate-x-1/2 rounded-full bg-white/[0.02] blur-[140px]" />

      <div className="relative mx-auto max-w-[1500px] px-5 md:px-8">
        {/* Heading */}
        <motion.div
          variants={containerVariant}
          initial="hidden"
          whileInView="visible"
          viewport={VP}
          className="mb-10 max-w-[760px] md:mb-14"
        >
          <motion.h2
            variants={fadeUpVariant}
            className="text-[22px] font-bold leading-[1.1] tracking-[-0.025em] text-white sm:text-[28px] md:text-[36px]"
          >
            Institutional payroll infrastructure,
            <span className="block text-white/50">
              built for modern execution.
            </span>
          </motion.h2>

          <motion.p
            variants={itemVariant}
            className="mt-4 max-w-[540px] text-[15px] leading-[1.7] text-white/45 md:text-[16px]"
          >
            Designed for institutional treasuries, HR teams, and global employees
            with verifiable non-custodial smart vaults on Circle Arc.
          </motion.p>
        </motion.div>

        {/* Desktop */}
        <motion.div
          variants={containerFast}
          initial="hidden"
          whileInView="visible"
          viewport={VP_TIGHT}
          className="hidden w-full gap-[2px] md:h-[520px] lg:flex lg:h-[560px] xl:h-[600px]"
        >
          {CARDS.map((card) => {
            const isActive = activeCard === card.id

            return (
              <motion.div
                key={card.id}
                layout
                variants={cardVariant}
                onMouseEnter={() => setActiveCard(card.id)}
                className={`
                  group flex flex-col overflow-hidden
                  bg-[#111113]
                  transition-all duration-700 ease-in-out
                  ${isActive ? 'flex-[2.4]' : 'flex-1'}
                `}
              >
                {/* Image */}
                <div className="relative h-1/2 overflow-hidden">
                  <img
                    src={card.image}
                    alt={card.title}
                    onError={(e) => {
                      ;(e.currentTarget).src = '/assets/zalarydash.png'
                    }}
                    className={`
                      h-full w-full object-cover transition-all duration-700
                      ${isActive ? 'scale-110' : 'scale-100'}
                    `}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/50" />
                </div>

                {/* Content */}
                <div
                  className={`
                    flex h-1/2 flex-col justify-between px-7 py-8
                    transition-all duration-500
                    ${isActive ? 'bg-[#1B1B1F]' : 'bg-[#111113]'}
                  `}
                >
                  <h3
                    className={`
                      font-semibold leading-[1.1] tracking-[-0.03em] text-white
                      transition-all duration-500
                      ${isActive ? 'text-[26px]' : 'text-[20px]'}
                    `}
                  >
                    {card.title}
                  </h3>

                  <p
                    className={`
                      mt-10 max-w-[95%] text-[15px] leading-[1.9]
                      text-white/60 transition-all duration-500 delay-100
                      ${
                        isActive
                          ? 'translate-y-0 opacity-100'
                          : 'translate-y-8 opacity-0'
                      }
                    `}
                  >
                    {card.subtitle}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Mobile */}
        <motion.div
          variants={containerFast}
          initial="hidden"
          whileInView="visible"
          viewport={VP_TIGHT}
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:hidden"
        >
          {CARDS.map((card) => (
            <motion.div
              key={card.id}
              variants={cardVariant}
              className="overflow-hidden bg-[#111113]"
            >
              <div className="relative h-[220px] overflow-hidden sm:h-[240px]">
                <img
                  src={card.image}
                  alt={card.title}
                  onError={(e) => {
                    ;(e.currentTarget).src = '/assets/zalarydash.png'
                  }}
                  className="h-full w-full object-cover transition duration-700"
                />
              </div>

              <div className="bg-[#151518] px-6 py-7">
                <h3 className="text-[18px] font-semibold text-white sm:text-[20px]">
                  {card.title}
                </h3>
                <p className="mt-6 text-[14px] leading-[1.7] text-white/65 sm:text-[15px]">
                  {card.subtitle}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
