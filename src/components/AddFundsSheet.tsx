import { useState } from 'react'
import { ArrowLeftRight, CreditCard } from 'lucide-react'
import { BridgePanel } from '@/components/BridgePanel'
import { BuyPanel } from '@/components/BuyPanel'
import { Sheet } from '@/components/ui'

type Tab = 'buy' | 'bridge'

export function AddFundsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('bridge')
  const tabs = [
    { key: 'bridge' as const, label: 'Cross-Chain Bridge', icon: ArrowLeftRight },
    { key: 'buy' as const, label: 'Card / Bank (Soon)', icon: CreditCard },
  ]

  return (
    <Sheet open={open} onClose={onClose} title="Add USDC to Circle Arc">
      <div role="tablist" className="filter-tabs employer-payroll-filters mb-5">
        {tabs.map((item) => {
          const active = tab === item.key
          return (
            <button
              key={item.key}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item.key)}
              className={`filter-tab${active ? ' active' : ''} flex-1 flex items-center justify-center gap-2`}
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
