/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "mainnet" builds for Arc Mainnet; anything else builds for Arc Testnet. */
  readonly VITE_NETWORK?: string
  /** Optional factory address override for the selected network. */
  readonly VITE_FACTORY_ADDRESS?: string
}

declare module '@circlefin/compass-chains' {
  export interface CompassChain {
    name: string
    explorerUrl?: string
    nativeCurrency: {
      symbol: string
    }
  }
  export function getChain(compassChain: string): CompassChain
}
