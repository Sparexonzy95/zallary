import { CreditCard } from 'lucide-react'

/** Card and bank purchases are not available yet. */
export function BuyPanel() {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-2xl px-6 py-12 text-center"
      style={{ background: 'var(--inset)', border: '1px solid var(--border)' }}
    >
      <span
        className="grid size-12 place-items-center rounded-full"
        style={{ background: 'rgba(254,158,21,0.14)', color: 'var(--accent)' }}
      >
        <CreditCard className="size-5" />
      </span>
      <p className="text-base font-semibold" style={{ color: 'var(--ink)' }}>
        Card and bank transfer: coming soon
      </p>
      <p className="max-w-sm text-sm" style={{ color: 'var(--muted)' }}>
        You will be able to buy USDC straight to your wallet with a card or bank transfer. For now, bring USDC from
        another chain using the Cross-Chain Bridge tab.
      </p>
    </div>
  )
}
