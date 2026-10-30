import { ARC_CHAIN, ARC_NAME } from '@/lib/network'
import { buildAddressExplorerUrl, buildTxExplorerUrl, getUsdc } from '@/onchain-facts'

export const CHAIN_ID = ARC_CHAIN.id
export const CHAIN_NAME = ARC_NAME

const usdc = getUsdc(CHAIN_ID)
if (!usdc) throw new Error(`USDC is not registered for ${ARC_NAME}`)
export const USDC_ADDRESS = usdc.address as `0x${string}`

export const addressUrl = (address: string) => buildAddressExplorerUrl(CHAIN_ID, address)
export const txUrl = (hash: string) => buildTxExplorerUrl(CHAIN_ID, hash)
