import { isAddress, type Address } from 'viem'
import { IS_MAINNET } from '@/lib/network'

/** ZalaryCompanyFactory on Arc Testnet. */
const TESTNET_FACTORY: Address | undefined = '0x738bc761ae2af90e70c8f3f51d85de4361fb4edb'

/** ZalaryCompanyFactory on Arc Mainnet. Set after the factory is deployed (or use VITE_FACTORY_ADDRESS). */
const MAINNET_FACTORY: Address | undefined = undefined

const override = import.meta.env.VITE_FACTORY_ADDRESS

/** Factory for the network this build targets. `VITE_FACTORY_ADDRESS` overrides it when set to a valid address. */
export const FACTORY_ADDRESS: Address | undefined =
  override && isAddress(override) ? override : IS_MAINNET ? MAINNET_FACTORY : TESTNET_FACTORY
