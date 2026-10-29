import { useState } from 'react'
import { useAccount } from 'wagmi'
import { isAddress, parseEventLogs, type Address } from 'viem'
import { factoryAbi } from '@/abi/factoryAbi'
import { FACTORY_ADDRESS } from '@/lib/deployments'
import { useTx } from '@/hooks/useTx'
import { Button, Label, Notice, Sheet } from '@/components/ui'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (vault: Address) => void
}

export function CreateCompanySheet({ open, onClose, onCreated }: Props) {
  const { address } = useAccount()
  const tx = useTx()
  const [name, setName] = useState('')
  const [recipient, setRecipient] = useState('')
  const [feePercent, setFeePercent] = useState('0.25')
  const [delayHours, setDelayHours] = useState('24')

  const feeRecipient = recipient || address || ''
  const feeBps = Math.round(Number(feePercent) * 100)
  const delayNumber = Number(delayHours)
  const problems: string[] = []
  if (name.trim().length === 0 || name.length > 64) problems.push('Enter a company name (up to 64 characters).')
  if (!isAddress(feeRecipient)) problems.push('Enter a valid fee recipient address.')
  if (!Number.isFinite(feeBps) || feeBps < 0 || feeBps > 500) problems.push('The fee must be between 0% and 5%.')
  if (!Number.isFinite(delayNumber) || delayNumber < 0) problems.push('The admin delay must be zero or more hours.')

  const submit = () => {
    const factory = FACTORY_ADDRESS
    if (!factory || problems.length > 0 || !isAddress(feeRecipient)) return
    void tx.run(
      (write) =>
        write({
          address: factory,
          abi: factoryAbi,
          functionName: 'createCompany',
          args: [name.trim(), Math.round(delayNumber * 3600), feeRecipient, BigInt(feeBps)],
        }),
      {
        success: 'Company created. You are its admin.',
        onDone: (receipt) => {
          const [created] = parseEventLogs({ abi: factoryAbi, logs: receipt.logs, eventName: 'CompanyCreated' })
          if (created) onCreated(created.args.vault)
          setName('')
          onClose()
        },
      },
    )
  }

  return (
    <Sheet open={open} onClose={onClose} title="Create a company">
      <div className="space-y-4">
        <p className="text-sm text-pretty" style={{ color: 'var(--muted)' }}>
          Your wallet becomes the admin of a new payroll vault that only holds this company's funds. You will assign HR and Finance next.
        </p>
        <div>
          <Label>Company name</Label>
          <input className="field" value={name} maxLength={64} onChange={(e) => setName(e.target.value)} placeholder="Acme Labs" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label hint="of each payroll">Fee</Label>
            <div className="relative">
              <input className="field pr-8 tabular-nums" inputMode="decimal" value={feePercent} onChange={(e) => setFeePercent(e.target.value.replace(/[^0-9.]/g, ''))} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--subtle)' }}>%</span>
            </div>
          </div>
          <div>
            <Label hint="hours">Admin change delay</Label>
            <input className="field tabular-nums" inputMode="numeric" value={delayHours} onChange={(e) => setDelayHours(e.target.value.replace(/[^0-9.]/g, ''))} />
          </div>
        </div>
        <div>
          <Label hint="receives the fee">Fee recipient</Label>
          <input className="field mono" value={recipient} onChange={(e) => setRecipient(e.target.value.trim())} placeholder={address ?? '0x…'} />
          <p className="mt-1.5 text-xs" style={{ color: 'var(--subtle)' }}>
            Defaults to your wallet. The fee is charged on top of each payroll when Finance funds it.
          </p>
        </div>
        {!FACTORY_ADDRESS && <Notice tone="warn">The company factory is not deployed yet.</Notice>}
        {problems.length > 0 && name.length > 0 && <Notice tone="warn">{problems[0]}</Notice>}
        {tx.error && <Notice tone="bad">{tx.error}</Notice>}
        <Button full onClick={submit} disabled={problems.length > 0 || !FACTORY_ADDRESS} loading={tx.busy}>
          {tx.status === 'wallet' ? 'Confirm in wallet' : tx.status === 'confirming' ? 'Creating company' : 'Create company'}
        </Button>
      </div>
    </Sheet>
  )
}
