/**
 * wagmi configuration
 * Built with Arc Studio — https://studio.arc.io
 */

import { http, createConfig } from 'wagmi'
import { arbitrum, arbitrumSepolia, arc, arcTestnet, base, baseSepolia, mainnet, sepolia } from 'viem/chains'
import { injected } from 'wagmi/connectors'
import { registerChain } from './tracing'

// Pre-register chain RPC URLs so trace events show correct chain names immediately
registerChain(arcTestnet.id, arcTestnet.rpcUrls.default.http[0])
registerChain(arc.id, arc.rpcUrls.default.http[0])

export const config = createConfig({
  // Arc is where payroll runs (which one is chosen in lib/network.ts). The others are bridge sources.
  chains: [arcTestnet, arc, sepolia, baseSepolia, arbitrumSepolia, mainnet, base, arbitrum],
  connectors: [injected()],
  transports: {
    [arcTestnet.id]: http(),
    [arc.id]: http(),
    [sepolia.id]: http(),
    [baseSepolia.id]: http(),
    [arbitrumSepolia.id]: http(),
    [mainnet.id]: http(),
    [base.id]: http(),
    [arbitrum.id]: http(),
  },
})
