interface Props<T extends string> {
  tabs: readonly { key: T; label: string }[]
  value: T
  onChange: (key: T) => void
}

/** Filter tabs that scroll sideways on small screens, with a pill indicator. */
export function Tabs<T extends string>({ tabs, value, onChange }: Props<T>) {
  return (
    <div role="tablist" className="scroll-x -mx-4 flex gap-1.5 px-4 sm:mx-0 sm:px-0">
      {tabs.map((tab) => {
        const active = value === tab.key
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.key)}
            className="min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold transition-all duration-200"
            style={
              active
                ? { background: 'var(--accent)', color: 'var(--on-accent)', boxShadow: '0 2px 8px rgba(254, 158, 21, 0.25)' }
                : { background: 'var(--inset)', color: 'var(--muted)', border: '1px solid var(--border)' }
            }
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
