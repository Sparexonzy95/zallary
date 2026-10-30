import { isAddress, type Address } from 'viem'
import { IS_MAINNET } from '@/lib/network'

/** ZalaryCompanyFactory on Arc Testnet. */
const TESTNET_FACTORY: Address | undefined = '0x061f5b2f0ae4cc0e1a6bb2ed17ebda265d694254'

/** ZalaryCompanyFactory on Arc Mainnet. Set after the factory is deployed (or use VITE_FACTORY_ADDRESS). */
const MAINNET_FACTORY: Address | undefined = undefined

const override = import.meta.env.VITE_FACTORY_ADDRESS

/** Factory for the network this build targets. `VITE_FACTORY_ADDRESS` overrides it when set to a valid address. */
export const FACTORY_ADDRESS: Address | undefined =
  override && isAddress(override) ? override : IS_MAINNET ? MAINNET_FACTORY : TESTNET_FACTORY
