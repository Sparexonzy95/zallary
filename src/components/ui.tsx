import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, ExternalLink, Loader2, X } from 'lucide-react'
import { addressUrl } from '@/lib/chain'
import { shortAddress } from '@/lib/format'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`glass rounded-3xl p-5 ${className}`}>{children}</section>
}

type Variant = 'primary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
  full?: boolean
}

export function Button({ variant = 'primary', loading, full, children, disabled, className = '', ...rest }: ButtonProps) {
  const style =
    variant === 'primary'
      ? { background: 'var(--accent)', color: 'var(--on-accent)' }
      : variant === 'danger'
        ? { background: 'rgba(255,107,107,0.12)', color: 'var(--danger)' }
        : { background: 'var(--inset)', color: 'var(--ink)', border: '1px solid var(--border)' }
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      style={style}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 ${full ? 'w-full' : ''} ${className}`}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  )
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'info' }) {
  const tones = {
    neutral: ['rgba(255,255,255,0.08)', 'var(--ink-2)'],
    good: ['rgba(56,217,150,0.14)', 'var(--success)'],
    warn: ['rgba(254,158,21,0.14)', 'var(--warn)'],
    bad: ['rgba(255,107,107,0.14)', 'var(--danger)'],
    info: ['rgba(254,158,21,0.14)', 'var(--accent-hover)'],
  } as const
  const [bg, fg] = tones[tone]
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: bg, color: fg }}>
      {children}
    </span>
  )
}

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
      <button onClick={() => void copy()} aria-label="Copy address" className="rounded p-1 hover:bg-white/10">
        {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      </button>
      <a href={addressUrl(address)} target="_blank" rel="noreferrer" aria-label="Open in explorer" className="rounded p-1 hover:bg-white/10">
        <ExternalLink className="size-3" />
      </a>
    </span>
  )
}

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
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.75)' }} />
          <motion.section
            role="dialog"
            aria-label={title}
            className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl sm:rounded-3xl"
            style={{ background: 'var(--elevated)', border: '1px solid var(--border)' }}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5">
              <h2 className="display text-xl font-bold text-balance">{title}</h2>
              <button onClick={onClose} aria-label="Close" className="flex size-11 items-center justify-center rounded-full hover:bg-white/10">
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

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="inner flex flex-col items-center gap-2 rounded-2xl px-6 py-10 text-center">
      <div className="display text-lg font-semibold">{title}</div>
      <p className="max-w-sm text-sm text-pretty" style={{ color: 'var(--muted)' }}>
        {body}
      </p>
      {action}
    </div>
  )
}

export function Notice({ tone, children }: { tone: 'warn' | 'bad' | 'info'; children: ReactNode }) {
  const colors = {
    warn: ['rgba(254,158,21,0.1)', 'var(--warn)'],
    bad: ['rgba(255,107,107,0.1)', 'var(--danger)'],
    info: ['rgba(255,255,255,0.06)', 'var(--ink-2)'],
  } as const
  const [bg, fg] = colors[tone]
  return (
    <div className="rounded-2xl px-4 py-3 text-sm text-pretty" style={{ background: bg, color: fg }}>
      {children}
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl ${className}`} style={{ background: 'var(--inset)' }} />
}
