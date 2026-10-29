/**
 * Zalary onramp backend. Mints Circle Onramp sessions for a wallet that has proven it owns the address.
 * The Circle API key stays here, on the server. Run with: bun run server
 */
import { createAppServerKit, KitError } from '@circle-fin/app-kit/server'
import { getAddress, isAddress, verifyMessage, type Hex } from 'viem'

const apiKey = process.env.CIRCLE_API_KEY
if (!apiKey) {
  console.error('CIRCLE_API_KEY is not set. The onramp backend cannot start.')
  process.exit(1)
}

const kit = createAppServerKit({
  onramp: {
    apiKey,
    baseUrl: process.env.ONRAMP_API_BASE_URL,
    widgetBaseUrl: process.env.VITE_ONRAMP_WIDGET_BASE_URL,
    referrerDomain: process.env.ONRAMP_REFERRER_DOMAIN,
  },
})

const MAX_AGE_MS = 10 * 60 * 1000
const STATUS: Record<string, number> = { INPUT: 400, RATE_LIMIT: 429, NETWORK: 504, SERVICE: 502, RPC: 502 }

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })

/** The wallet must sign a fresh message that names its own address. */
async function ownsAddress(request: Request, address: string): Promise<boolean> {
  const rawMessage = request.headers.get('x-zalary-message')
  const signature = request.headers.get('x-zalary-signature')
  if (!rawMessage || !signature || !signature.startsWith('0x')) return false
  const message = decodeURIComponent(rawMessage)
  const wallet = /^Wallet: (0x[0-9a-fA-F]{40})$/m.exec(message)?.[1]
  const issued = /^Issued: (.+)$/m.exec(message)?.[1]
  if (!wallet || !issued || !message.startsWith('Zalary onramp')) return false
  if (wallet.toLowerCase() !== address.toLowerCase()) return false
  const age = Date.now() - Date.parse(issued)
  if (!Number.isFinite(age) || age < -60_000 || age > MAX_AGE_MS) return false
  try {
    return (await verifyMessage({ address: getAddress(address), message, signature: signature as Hex })) === true
  } catch {
    return false
  }
}

async function mintSession(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { appUserId?: unknown; destinationAddress?: unknown } | null
  const destination = body?.destinationAddress
  if (typeof destination !== 'string' || !isAddress(destination)) return json({ message: 'A valid destinationAddress is required.' }, 400)
  const appUserId = getAddress(destination).toLowerCase()
  if (body?.appUserId !== appUserId) return json({ message: 'appUserId must be the lowercase wallet address.' }, 401)
  if (!(await ownsAddress(request, destination))) return json({ message: 'Sign in with your wallet first.' }, 401)
  try {
    const session = await kit.onramp.createSession({
      appUserId,
      destinationAddress: getAddress(destination),
      assets: { tokens: ['USDC'] },
    })
    return json(session)
  } catch (error) {
    console.error('onramp session mint failed', error)
    if (error instanceof KitError) return json({ message: error.message }, STATUS[error.type] ?? 500)
    return json({ message: 'Could not start the onramp.' }, 500)
  }
}

export default {
  port: Number(process.env.PORT ?? 8787),
  async fetch(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url)
    if (pathname === '/api/health') return json({ ok: true })
    if (pathname === '/api/onramp/sessions') {
      return request.method === 'POST' ? mintSession(request) : json({ message: 'Method not allowed.' }, 405)
    }
    return json({ message: 'Not found.' }, 404)
  },
}
