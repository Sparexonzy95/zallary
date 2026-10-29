import { useState } from 'react'
import { BridgePanel } from '@/components/BridgePanel'
import { BuyPanel } from '@/components/BuyPanel'
import { Sheet } from '@/components/ui'

type Tab = 'buy' | 'bridge'

export function AddFundsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('buy')
  const tabs: { key: Tab; label: string }[] = [
    { key: 'buy', label: 'Buy with card or bank' },
    { key: 'bridge', label: 'Bridge from another chain' },
  ]
  return (
    <Sheet open={open} onClose={onClose} title="Add USDC to Arc">
      <div role="tablist" className="glass mb-4 flex gap-1 rounded-2xl p-1">
        {tabs.map((item) => (
          <button
            key={item.key}
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className="min-h-11 flex-1 rounded-xl px-2 text-xs font-semibold transition-colors sm:text-sm"
            style={tab === item.key ? { background: 'var(--accent)', color: 'var(--on-accent)' } : { color: 'var(--ink-2)' }}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === 'buy' ? <BuyPanel /> : <BridgePanel />}
    </Sheet>
  )
}
