import { useState } from 'react'
import { ArrowLeftRight, CreditCard } from 'lucide-react'
import { BridgePanel } from '@/components/BridgePanel'
import { BuyPanel } from '@/components/BuyPanel'
import { Sheet } from '@/components/ui'

type Tab = 'buy' | 'bridge'

export function AddFundsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('buy')
  const tabs = [
    { key: 'buy' as const, label: 'Credit Card / Bank', icon: CreditCard },
    { key: 'bridge' as const, label: 'Cross-Chain Bridge', icon: ArrowLeftRight },
  ]

  return (
    <Sheet open={open} onClose={onClose} title="Add USDC to Arc">
      <div role="tablist" className="inner mb-4 flex gap-1 rounded-2xl p-1.5">
        {tabs.map((item) => {
          const active = tab === item.key
          return (
            <button
              key={item.key}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item.key)}
              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-2 text-xs font-semibold transition-all duration-200 sm:text-sm"
              style={
                active
                  ? {
                      background: 'var(--accent)',
                      color: 'var(--on-accent)',
                      boxShadow: '0 2px 8px rgba(254, 158, 21, 0.25)',
                    }
                  : { color: 'var(--ink-2)' }
              }
            >
              <item.icon className="size-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>
      {tab === 'buy' ? <BuyPanel /> : <BridgePanel />}
    </Sheet>
  )
}
