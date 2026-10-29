const LOGO_SRC = '/assets/landing/logo_zalary2_mm8mlp.png'

export function ZalaryMark({ className = 'h-7 w-auto' }: { className?: string }) {
  return (
    <img
      src={LOGO_SRC}
      alt="Zalary"
      className={className}
      style={{ objectFit: 'contain' }}
    />
  )
}
