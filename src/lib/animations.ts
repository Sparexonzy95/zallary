import type { Variants } from 'framer-motion'

const ease = [0.22, 1, 0.36, 1] as const

// ── Viewport presets ─────────────────────────────────────────────
export const VP = { once: true, margin: '-100px' } as const
export const VP_TIGHT = { once: true, margin: '-60px' } as const

// ── Container variants (stagger parent) ──────────────────────────
export const containerVariant: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.05 },
  },
}

export const containerFast: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0 },
  },
}

// ── Directional entrance variants ────────────────────────────────
export const fadeUpVariant: Variants = {
  hidden: {
    opacity: 0,
    y: 56,
    scale: 0.97,
    filter: 'blur(4px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.65, ease },
  },
}

export const fadeLeftVariant: Variants = {
  hidden: {
    opacity: 0,
    x: -56,
    scale: 0.97,
    filter: 'blur(4px)',
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.65, ease },
  },
}

export const fadeRightVariant: Variants = {
  hidden: {
    opacity: 0,
    x: 56,
    scale: 0.97,
    filter: 'blur(4px)',
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.65, ease },
  },
}

// ── Child element variants ────────────────────────────────────────
export const itemVariant: Variants = {
  hidden: {
    opacity: 0,
    y: 28,
    filter: 'blur(3px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.55, ease },
  },
}

export const cardVariant: Variants = {
  hidden: {
    opacity: 0,
    y: 40,
    scale: 0.96,
    filter: 'blur(4px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.6, ease },
  },
}
