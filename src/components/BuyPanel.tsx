import { useEffect, useRef, useState } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { AppKit, KitError, type OnrampSession } from '@circle-fin/app-kit'
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
        setMessage('The payment window could not load. Please try again.')
      },
      onDepositSubmitted: () => setPhase('submitted'),
      onDepositNotCompleted: ({ code }) => {
        setPhase('closed')
        setMessage(code === 'CANCELED_BY_CUSTOMER' ? 'Purchase cancelled.' : 'The purchase did not complete.')
      },
      onSessionExpired: () => {
        setPhase('closed')
        setMessage('This session expired. Start again.')
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
            ? 'Could not start the purchase. Check that the on-ramp backend is running.'
            : 'Could not start the purchase. Please try again.',
      )
    }
  }

  const busy = phase === 'signing' || phase === 'loading'
  const showWidget = session !== null && (phase === 'open' || phase === 'loading' || phase === 'submitted')

  return (
    <div className="space-y-4">
      <p className="text-sm text-pretty" style={{ color: 'var(--muted)' }}>
        Pay with a bank transfer or card and receive USDC in your wallet. You confirm it is your wallet by signing a free message. No gas is used.
      </p>
      {isSandbox && (
        <Notice tone="info">
          This is Circle's test mode. No real money moves, and test purchases arrive on Ethereum. Use the Bridge tab to move them to Arc.
        </Notice>
      )}
      {message && <Notice tone={phase === 'error' ? 'bad' : 'warn'}>{message}</Notice>}
      {phase === 'submitted' && <Notice tone="info">Purchase submitted. Your USDC arrives shortly. You can close this window.</Notice>}
      {!showWidget && (
        <Button full loading={busy} disabled={!address} onClick={() => void start()}>
          {phase === 'signing' ? 'Sign in your wallet' : phase === 'loading' ? 'Opening' : session ? 'Start again' : 'Buy USDC'}
        </Button>
      )}
      <div ref={containerRef} style={{ width: '100%', height: showWidget ? 720 : 0, overflow: 'hidden' }} />
    </div>
  )
}
