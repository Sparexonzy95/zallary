import { type Address } from 'viem'
import { Sheet } from '@/components/ui'
import { RegisterInstitutionPage } from '@/components/RegisterInstitutionPage'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (vault: Address) => void
}

export function CreateCompanySheet({ open, onClose, onCreated }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title="Register Institution Vault">
      <RegisterInstitutionPage
        onCreated={(vault) => {
          onCreated(vault)
          onClose()
        }}
        onBack={onClose}
      />
    </Sheet>
  )
}
