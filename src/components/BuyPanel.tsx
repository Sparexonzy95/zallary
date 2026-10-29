import { useEffect, useRef, useState } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { AppKit, KitError, type OnrampSession } from '@circle-fin/app-kit'
import { CreditCard } from 'lucide-react'
import { Button, Notice } from '@/components/ui'

const widgetBaseUrl = import.meta.env.VITE_ONRAMP_WIDGET_BASE_URL as string | undefined
const kit = new AppKit({ onramp: { widgetBaseUrl } })
const isSandbox = Boolean(widgetBaseUrl?.includes('sandbox'))

type Phase = 'idle' | 'signing' | 'loading' | 'open' | 'submitted' | 'closed' | 'error'

export function BuyPanel() {
  const { address } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<{ close: () => void } | null>(null)
  const [session, setSession] = useState<OnrampSession | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [message, setMessage] = useState<string>()

  // Mount the Circle widget once a session exists and the container is on screen.
  useEffect(() => {
    const container = containerRef.current
    if (!session || !container) return
    widgetRef.current = kit.onramp.mountIframe({
      session,
      container,
      onInitializationSuccess: () => setPhase('open'),
      onInitializationError: () => {
        setPhase('error')
        setMessage('The payment gateway failed to initialize. Please retry.')
      },
      onDepositSubmitted: () => setPhase('submitted'),
      onDepositNotCompleted: ({ code }) => {
        setPhase('closed')
        setMessage(code === 'CANCELED_BY_CUSTOMER' ? 'Purchase cancelled.' : 'Purchase was not completed.')
      },
      onSessionExpired: () => {
        setPhase('closed')
        setMessage('Onramp checkout session expired. Please restart.')
      },
    })
    return () => {
      widgetRef.current?.close()
      widgetRef.current = null
    }
  }, [session])

  const start = async () => {
    if (!address) return
    setMessage(undefined)
    setSession(null)
    try {
      setPhase('signing')
      const text = `Zalary onramp\nWallet: ${address}\nIssued: ${new Date().toISOString()}`
      const signature = await signMessageAsync({ message: text })
      setPhase('loading')
      const minted = await kit.onramp.fetchSession({
        url: '/api/onramp/sessions',
        body: { appUserId: address.toLowerCase(), destinationAddress: address },
        headers: { 'x-zalary-message': encodeURIComponent(text), 'x-zalary-signature': signature },
      })
      setSession(minted)
    } catch (error) {
      const rejected = /user rejected|denied/i.test(error instanceof Error ? error.message : '')
      setPhase(rejected ? 'idle' : 'error')
      setMessage(
        rejected
          ? undefined
          : error instanceof KitError
            ? 'Could not start purchase: verify that the Circle on-ramp server backend is active.'
            : 'Could not initialize fiat on-ramp. Please try again.',
      )
    }
  }

  const busy = phase === 'signing' || phase === 'loading'
  const showWidget = session !== null && (phase === 'open' || phase === 'loading' || phase === 'submitted')

  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--muted)] leading-relaxed">
        Purchase USDC with a credit card or bank transfer directly into your connected wallet. Ownership verification uses a gas-free signature.
      </p>

      {isSandbox && (
        <Notice tone="info">
          Circle Sandbox Mode: Test transactions do not charge real fiat. Test USDC delivers to Ethereum Sepolia; use the Cross-Chain Bridge tab to move funds to Arc.
        </Notice>
      )}

      {message && <Notice tone={phase === 'error' ? 'bad' : 'warn'}>{message}</Notice>}

      {phase === 'submitted' && (
        <Notice tone="info">
          Purchase submitted successfully! Your USDC will arrive shortly.
        </Notice>
      )}

      {!showWidget && (
        <Button full loading={busy} disabled={!address} onClick={() => void start()}>
          <CreditCard className="size-4" />
          {phase === 'signing'
            ? 'Sign Verification in Wallet…'
            : phase === 'loading'
              ? 'Opening Checkout Session…'
              : session
                ? 'Restart Payment Session'
                : 'Purchase USDC with Card / Bank'}
        </Button>
      )}

      <div
        ref={containerRef}
        className="rounded-2xl overflow-hidden"
        style={{ width: '100%', height: showWidget ? 720 : 0 }}
      />
    </div>
  )
}
