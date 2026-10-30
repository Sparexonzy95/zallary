import { useCallback, useState } from 'react'
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Hash, TransactionReceipt } from 'viem'
import { CHAIN_ID } from '@/lib/chain'
import { describeError } from '@/lib/errors'

export type TxStatus = 'idle' | 'wallet' | 'confirming' | 'success' | 'error'

interface RunOptions {
  /** Toast shown after the transaction is confirmed. */
  success?: string
  onDone?: (receipt: TransactionReceipt) => void
}

/**
 * Sends one contract write: switches to the Arc network if needed, waits for the wallet,
 * waits for the receipt, then refreshes all cached reads. Only real states are reported.
 */
export function useTx() {
  const { chainId, isConnected } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()
  const client = usePublicClient({ chainId: CHAIN_ID })
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<TxStatus>('idle')
  const [hash, setHash] = useState<Hash>()
  const [error, setError] = useState<string>()

  const run = useCallback(
    async (send: (write: typeof writeContractAsync) => Promise<Hash>, options: RunOptions = {}) => {
      if (!isConnected || !client) return null
      setError(undefined)
      setHash(undefined)
      try {
        if (chainId !== CHAIN_ID) await switchChainAsync({ chainId: CHAIN_ID })
        setStatus('wallet')
        const txHash = await send(writeContractAsync)
        setHash(txHash)
        setStatus('confirming')
        const receipt = await client.waitForTransactionReceipt({ hash: txHash })
        if (receipt.status !== 'success') throw new Error('The transaction reverted onchain.')
        setStatus('success')
        await queryClient.invalidateQueries()
        if (options.success) toast.success(options.success)
        options.onDone?.(receipt)
        return receipt
      } catch (caught) {
        const message = describeError(caught)
        if (message === null) {
          setStatus('idle')
        } else {
          setStatus('error')
          setError(message)
          toast.error(message)
        }
        return null
      }
    },
    [chainId, client, isConnected, queryClient, switchChainAsync, writeContractAsync],
  )

  const reset = useCallback(() => {
    setStatus('idle')
    setError(undefined)
    setHash(undefined)
  }, [])

  return { run, reset, status, hash, error, busy: status === 'wallet' || status === 'confirming' }
}
