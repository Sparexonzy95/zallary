interface Props<T extends string> {
  tabs: readonly { key: T; label: string }[]
  value: T
  onChange: (key: T) => void
}

/** Filter tabs that scroll sideways on small screens. */
export function Tabs<T extends string>({ tabs, value, onChange }: Props<T>) {
  return (
    <div role="tablist" className="scroll-x -mx-4 flex gap-2 px-4 sm:mx-0 sm:px-0">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          role="tab"
          aria-selected={value === tab.key}
          onClick={() => onChange(tab.key)}
          className="min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors"
          style={
            value === tab.key
              ? { background: 'var(--accent)', color: 'var(--on-accent)' }
              : { background: 'var(--surface)', color: 'var(--ink-2)', border: '1px solid var(--border)' }
          }
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
