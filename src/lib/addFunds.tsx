import { createContext, useContext } from 'react'

interface AddFundsContextValue {
  open: () => void
}

export const AddFundsContext = createContext<AddFundsContextValue>({ open: () => undefined })

/** Opens the "Add USDC" sheet (buy with card or bank, or bridge from another chain). */
export const useAddFunds = () => useContext(AddFundsContext)
