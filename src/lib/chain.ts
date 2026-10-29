import { arcTestnet } from 'viem/chains'
import { buildAddressExplorerUrl, buildTxExplorerUrl, getUsdc } from '@/onchain-facts'

export const CHAIN_ID = arcTestnet.id
export const CHAIN_NAME = 'Arc Testnet'

const usdc = getUsdc(CHAIN_ID)
if (!usdc) throw new Error('USDC is not registered for Arc Testnet')
export const USDC_ADDRESS = usdc.address as `0x${string}`

export const addressUrl = (address: string) => buildAddressExplorerUrl(CHAIN_ID, address)
export const txUrl = (hash: string) => buildTxExplorerUrl(CHAIN_ID, hash)
