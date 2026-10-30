import type { Chain } from 'viem'
import { arbitrum, arbitrumSepolia, arc, arcTestnet, base, baseSepolia, mainnet, sepolia } from 'viem/chains'

/**
 * Which Arc network this build talks to. Set `VITE_NETWORK=mainnet` at build time for production.
 * Anything else (including unset) builds for Arc Testnet, so a plain `bun run dev` can never touch mainnet.
 */
export type NetworkKind = 'testnet' | 'mainnet'

export const NETWORK: NetworkKind = import.meta.env.VITE_NETWORK === 'mainnet' ? 'mainnet' : 'testnet'
export const IS_MAINNET = NETWORK === 'mainnet'

export const ARC_CHAIN = IS_MAINNET ? arc : arcTestnet
export const ARC_NAME = IS_MAINNET ? 'Arc Mainnet' : 'Arc Testnet'
/** Name Circle's bridge kit uses for the Arc destination. */
export const ARC_KIT_NAME = IS_MAINNET ? 'Arc' : 'Arc_Testnet'

/** Chains USDC can be bridged in from. */
export const BRIDGE_SOURCES = IS_MAINNET
  ? ([
      { id: mainnet.id, chain: mainnet, label: 'Ethereum', kitName: 'Ethereum' },
      { id: base.id, chain: base, label: 'Base', kitName: 'Base' },
      { id: arbitrum.id, chain: arbitrum, label: 'Arbitrum', kitName: 'Arbitrum' },
    ] as const)
  : ([
      { id: sepolia.id, chain: sepolia, label: 'Ethereum Sepolia', kitName: 'Ethereum_Sepolia' },
      { id: baseSepolia.id, chain: baseSepolia, label: 'Base Sepolia', kitName: 'Base_Sepolia' },
      { id: arbitrumSepolia.id, chain: arbitrumSepolia, label: 'Arbitrum Sepolia', kitName: 'Arbitrum_Sepolia' },
    ] as const)

export const BRIDGE_CHAINS: readonly Chain[] = [ARC_CHAIN, ...BRIDGE_SOURCES.map((source) => source.chain)]
