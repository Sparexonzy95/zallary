import { useState } from 'react'
import { useAccount, useReadContract, useSwitchChain } from 'wagmi'
import { createViemAdapterFromProvider } from '@circle-fin/adapter-viem-v2'
import { AppKit, KitError, type BridgeResult } from '@circle-fin/app-kit'
import { arbitrumSepolia, arcTestnet, baseSepolia, sepolia } from 'viem/chains'
import { erc20Abi, type EIP1193Provider } from 'viem'
import { ArrowRight, ExternalLink } from 'lucide-react'
import { getUsdc } from '@/onchain-facts'
import { Amount, parseUsdc, usdcDecimalsFor } from '@/onchain-money'
import { withAddChainFallback } from '@/lib/bridgeProvider'
import { usdc } from '@/lib/format'
import { Button, Label, Notice } from '@/components/ui'

const kit = new AppKit()
const supportedChains = [arcTestnet, sepolia, baseSepolia, arbitrumSepolia] as const

const SOURCES = [
  { id: sepolia.id, label: 'Ethereum Sepolia', kitName: 'Ethereum_Sepolia' },
  { id: baseSepolia.id, label: 'Base Sepolia', kitName: 'Base_Sepolia' },
  { id: arbitrumSepolia.id, label: 'Arbitrum Sepolia', kitName: 'Arbitrum_Sepolia' },
] as const

export function BridgePanel() {
  const { address, connector, chainId } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const [source, setSource] = useState<(typeof SOURCES)[number]>(SOURCES[0])
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [result, setResult] = useState<BridgeResult>()

  const token = getUsdc(source.id)
  const balance = useReadContract({
    address: token?.address as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address ?? '0x0000000000000000000000000000000000000000'],
    chainId: source.id,
    query: { enabled: Boolean(token && address), refetchInterval: 15_000 },
  })

  let raw = 0n
  try {
    raw = amount ? parseUsdc(amount) : 0n
  } catch {
    raw = 0n
  }
  const enough = balance.data !== undefined && raw > 0n && raw <= balance.data
  const maxText = balance.data !== undefined ? Amount.fromRaw(balance.data, usdcDecimalsFor(source.id)).toString() : ''

  const bridge = async () => {
    if (!connector || !address || !enough) return
    setBusy(true)
    setError(undefined)
    setResult(undefined)
    try {
      if (chainId !== source.id) await switchChainAsync({ chainId: source.id })
      const provider = (await connector.getProvider()) as EIP1193Provider
      const adapter = await createViemAdapterFromProvider({ provider: withAddChainFallback(provider, supportedChains) })
      const bridged = await kit.bridge({
        from: { adapter, chain: source.kitName },
        to: { adapter, chain: 'Arc_Testnet' },
        amount,
      })
      setResult(bridged)
      if (bridged.state !== 'success') setError('The transfer did not finish. Your funds are safe. Try again in a minute.')
    } catch (caught) {
      const text = caught instanceof Error ? caught.message : ''
      if (/user rejected|denied/i.test(text)) setError(undefined)
      else if (caught instanceof KitError) setError(`The bridge could not complete: ${caught.message}`)
      else setError('The bridge could not complete. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-pretty" style={{ color: 'var(--muted)' }}>
        Move USDC you hold on another test network to Arc. It arrives in this same wallet, usually within a minute.
      </p>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div>
          <Label>From</Label>
          <select
            className="field"
            value={source.id}
            onChange={(e) => setSource(SOURCES.find((s) => s.id === Number(e.target.value)) ?? SOURCES[0])}
          >
            {SOURCES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <ArrowRight className="mt-6 size-4" style={{ color: 'var(--subtle)' }} />
        <div>
          <Label>To</Label>
          <div className="field flex items-center">Arc Testnet</div>
        </div>
      </div>
      <div>
        <Label hint={balance.data !== undefined ? `balance ${usdc(balance.data)}` : undefined}>Amount (USDC)</Label>
        <div className="relative">
          <input
            className="field pr-16 tabular-nums"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9.]/g, '')
              if (/^\d*\.?\d*$/.test(value)) setAmount(value)
            }}
          />
          <button
            onClick={() => maxText && setAmount(maxText)}
            disabled={!maxText}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold disabled:opacity-40"
            style={{ color: 'var(--accent-hover)' }}
          >
            Max
          </button>
        </div>
        {raw > 0n && balance.data !== undefined && raw > balance.data && (
          <p className="mt-1.5 text-xs" style={{ color: 'var(--danger)' }}>
            You only have {usdc(balance.data)} USDC on {source.label}.
          </p>
        )}
      </div>
      <p className="text-xs text-pretty" style={{ color: 'var(--subtle)' }}>
        You also need a little of {source.label}'s own gas token in this wallet to start the transfer.
      </p>
      {error && <Notice tone="bad">{error}</Notice>}
      {result?.state === 'success' && (
        <div className="inner space-y-2 rounded-2xl p-4 text-sm">
          <div className="font-semibold" style={{ color: 'var(--success)' }}>
            {result.amount} USDC is on Arc
          </div>
          {result.steps
            .filter((step) => step.explorerUrl)
            .map((step) => (
              <a key={step.name} href={step.explorerUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs capitalize">
                {step.name} <ExternalLink className="size-3" />
              </a>
            ))}
        </div>
      )}
      <Button full disabled={!address || !enough} loading={busy} onClick={() => void bridge()}>
        {busy ? 'Bridging. Confirm in your wallet if asked' : 'Bridge to Arc'}
      </Button>
    </div>
  )
}
