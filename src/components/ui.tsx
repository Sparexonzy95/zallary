import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, AlertTriangle, Check, Copy, ExternalLink, Info, Loader2, X } from 'lucide-react'
import { addressUrl } from '@/lib/chain'
import { shortAddress } from '@/lib/format'

/* ─── Card ─── */

export function Card({ children, className = '', glow }: { children: ReactNode; className?: string; glow?: boolean }) {
  return (
    <section className={`glass rounded-3xl p-5 ${glow ? 'gradient-border' : ''} ${className}`}>
      {children}
    </section>
  )
}

/* ─── Button ─── */

type Variant = 'primary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
  full?: boolean
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'btn-primary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
}

export function Button({ variant = 'primary', loading, full, children, disabled, className = '', ...rest }: ButtonProps) {
  const v = variant
  const style =
    v === 'primary'
      ? { background: 'var(--accent)', color: 'var(--on-accent)' }
      : v === 'danger'
        ? { background: 'var(--danger-dim)', color: 'var(--danger)' }
        : { background: 'var(--inset)', color: 'var(--ink)', border: '1px solid var(--border)' }
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      style={style}
      className={`${VARIANT_CLASSES[v]} inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 ${full ? 'w-full' : ''} ${className}`}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  )
}

/* ─── Badge ─── */

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'info' }) {
  const tones = {
    neutral: ['rgba(255,255,255,0.06)', 'var(--ink-2)'],
    good: ['rgba(56,217,150,0.12)', 'var(--success)'],
    warn: ['rgba(254,158,21,0.12)', 'var(--warn)'],
    bad: ['rgba(255,107,107,0.12)', 'var(--danger)'],
    info: ['rgba(254,158,21,0.12)', 'var(--accent-hover)'],
  } as const
  const [bg, fg] = tones[tone]
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider"
      style={{ background: bg, color: fg }}
    >
      {children}
    </span>
  )
}

/* ─── Label ─── */

export function Label({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--muted)' }}>
        {children}
      </span>
      {hint && (
        <span className="ml-2 text-xs normal-case tracking-normal" style={{ color: 'var(--subtle)' }}>
          {hint}
        </span>
      )}
    </div>
  )
}

/* ─── Field ─── */

export function Field({
  label,
  help,
  error,
  children,
  className = '',
}: {
  label: ReactNode
  help?: ReactNode
  error?: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={`field ${className}`.trim()}>
      <span className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--muted)' }}>
        {label}
      </span>
      {children}
      {help && (
        <span className="text-[11px]" style={{ color: 'var(--subtle)' }}>
          {help}
        </span>
      )}
      {error && <span className="text-xs" style={{ color: 'var(--danger)' }}>{error}</span>}
    </label>
  )
}

/* ─── StatCard ─── */

export function StatCard({
  value,
  label,
  accent,
}: {
  value: ReactNode
  label: string
  accent?: boolean
}) {
  return (
    <div className={`stat-card${accent ? ' accent-card' : ''}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

/* ─── AddressLink ─── */

export function AddressLink({ address, label }: { address: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="mono text-xs tabular-nums" style={{ color: 'var(--ink-2)' }} title={address}>
        {label ?? shortAddress(address)}
      </span>
      <button onClick={() => void copy()} aria-label="Copy address" className="rounded-lg p-1.5 transition-colors hover:bg-white/10">
        {copied ? <Check className="size-3" style={{ color: 'var(--success)' }} /> : <Copy className="size-3" style={{ color: 'var(--subtle)' }} />}
      </button>
      <a href={addressUrl(address)} target="_blank" rel="noreferrer" aria-label="Open in explorer" className="rounded-lg p-1.5 transition-colors hover:bg-white/10">
        <ExternalLink className="size-3" style={{ color: 'var(--subtle)' }} />
      </a>
    </span>
  )
}

/* ─── Sheet ─── */

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 backdrop-blur-md" style={{ background: 'rgba(0,0,0,0.8)' }} />
          <motion.section
            role="dialog"
            aria-label={title}
            className="glass-elevated relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl sm:rounded-3xl"
            initial={{ y: 40, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            onClick={(event) => event.stopPropagation()}
          >
            {/* Mobile handle */}
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="h-1 w-10 rounded-full" style={{ background: 'var(--border-strong)' }} />
            </div>
            <div className="flex items-center justify-between px-5 pt-4 sm:pt-5">
              <h2 className="display text-xl font-bold text-balance">{title}</h2>
              <button onClick={onClose} aria-label="Close" className="flex size-11 items-center justify-center rounded-full transition-colors hover:bg-white/10">
                <X className="size-5" />
              </button>
            </div>
            <div className="px-5 pb-6 pt-3">{children}</div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ─── EmptyState ─── */

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="inner flex flex-col items-center gap-3 rounded-2xl px-6 py-12 text-center">
      <div className="mb-1 flex size-12 items-center justify-center rounded-full" style={{ background: 'var(--accent-dim)' }}>
        <Info className="size-5" style={{ color: 'var(--accent)' }} />
      </div>
      <div className="display text-lg font-semibold">{title}</div>
      <p className="max-w-sm text-sm text-pretty leading-relaxed" style={{ color: 'var(--muted)' }}>
        {body}
      </p>
      {action}
    </div>
  )
}

/* ─── Notice ─── */

const NOTICE_ICON = {
  warn: AlertTriangle,
  bad: AlertCircle,
  info: Info,
} as const

export function Notice({ tone, children }: { tone: 'warn' | 'bad' | 'info'; children: ReactNode }) {
  const colors = {
    warn: ['rgba(254,158,21,0.08)', 'var(--warn)', 'rgba(254,158,21,0.18)'],
    bad: ['rgba(255,107,107,0.08)', 'var(--danger)', 'rgba(255,107,107,0.18)'],
    info: ['rgba(255,255,255,0.04)', 'var(--ink-2)', 'rgba(255,255,255,0.08)'],
  } as const
  const [bg, fg, border] = colors[tone]
  const Icon = NOTICE_ICON[tone]
  return (
    <div className="flex items-start gap-3 rounded-2xl px-4 py-3 text-sm text-pretty" style={{ background: bg, color: fg, border: `1px solid ${border}` }}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

/* ─── Skeleton ─── */

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-xl ${className}`} />
}

/* ─── SectionLabel ─── */

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--subtle)' }}>
      {children}
    </p>
  )
}

/* ─── StatBlock (reusable stat display) ─── */

export function StatBlock({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--subtle)' }}>{label}</p>
      <p className="display mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>{sub}</p>}
    </div>
  )
}
