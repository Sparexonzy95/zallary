import { formatUsdc } from '@/onchain-money'

export const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`
export const shortId = (id: string) => `${id.slice(0, 8)}…${id.slice(-4)}`

export function usdc(raw: bigint): string {
  const [whole, frac = ''] = formatUsdc(raw).split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const cents = frac.padEnd(2, '0')
  return `${grouped}.${cents}`
}

export function formatDate(seconds: bigint | number): string {
  return new Date(Number(seconds) * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function bpsToPercent(bps: bigint | number): string {
  return `${(Number(bps) / 100).toFixed(2)}%`
}
