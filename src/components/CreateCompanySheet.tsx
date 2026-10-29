import { useState } from 'react'
import { useAccount } from 'wagmi'
import { isAddress, parseEventLogs, type Address } from 'viem'
import { ShieldCheck } from 'lucide-react'
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
  if (name.trim().length === 0 || name.length > 64) {
    problems.push('Enter a company or organization name (1 to 64 characters).')
  }
  if (!isAddress(feeRecipient)) {
    problems.push('Enter a valid fee beneficiary address.')
  }
  if (!Number.isFinite(feeBps) || feeBps < 0 || feeBps > 500) {
    problems.push('The protocol fee must be between 0.00% and 5.00%.')
  }
  if (!Number.isFinite(delayNumber) || delayNumber < 0) {
    problems.push('Admin transition delay must be zero or positive.')
  }

  const submit = () => {
    const factory = FACTORY_ADDRESS
    if (!factory || problems.length > 0 || !isAddress(feeRecipient)) return
    void tx.run(
      (write) =>
        write({
          address: factory,
          abi: factoryAbi,
          functionName: 'createCompany',
          args: [
            name.trim(),
            Math.round(delayNumber * 3600),
            feeRecipient,
            BigInt(feeBps),
          ],
        }),
      {
        success: 'Company Vault deployed on Arc! You are its initial Administrator.',
        onDone: (receipt) => {
          const [created] = parseEventLogs({
            abi: factoryAbi,
            logs: receipt.logs,
            eventName: 'CompanyCreated',
          })
          if (created) onCreated(created.args.vault)
          setName('')
          onClose()
        },
      },
    )
  }

  return (
    <Sheet open={open} onClose={onClose} title="Deploy Company Vault">
      <div className="space-y-4">
        <div className="inner rounded-2xl p-4 flex items-start gap-3">
          <ShieldCheck className="size-5 text-[var(--accent)] shrink-0 mt-0.5" />
          <p className="text-xs text-[var(--muted)] leading-relaxed">
            Deploys an independent, non-custodial smart escrow contract on Arc. Your wallet receives Administrator and emergency Pauser authorizations.
          </p>
        </div>

        <div>
          <Label>Organization / Company Name</Label>
          <input
            className="field"
            value={name}
            maxLength={64}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Acme Treasury Labs"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label hint="Max 5%">Protocol Fee</Label>
            <div className="relative">
              <input
                className="field pr-8 tabular-nums text-right"
                inputMode="decimal"
                value={feePercent}
                onChange={(e) =>
                  setFeePercent(e.target.value.replace(/[^0-9.]/g, ''))
                }
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--subtle)]">
                %
              </span>
            </div>
          </div>

          <div>
            <Label hint="Security timelock">Admin Delay (hrs)</Label>
            <input
              className="field tabular-nums text-right"
              inputMode="numeric"
              value={delayHours}
              onChange={(e) =>
                setDelayHours(e.target.value.replace(/[^0-9.]/g, ''))
              }
            />
          </div>
        </div>

        <div>
          <Label hint="Receives protocol fee at funding">Fee Beneficiary</Label>
          <input
            className="field mono text-xs sm:text-sm"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value.trim())}
            placeholder={address ?? '0x… wallet address'}
          />
          <p className="mt-1.5 text-xs text-[var(--subtle)]">
            Defaults to your current wallet. Fees are levied on top of payroll when Finance funds a batch.
          </p>
        </div>

        {!FACTORY_ADDRESS && (
          <Notice tone="warn">The company factory address is not configured for Arc Testnet.</Notice>
        )}

        {problems.length > 0 && name.length > 0 && (
          <Notice tone="warn">{problems[0]}</Notice>
        )}

        {tx.error && <Notice tone="bad">{tx.error}</Notice>}

        <Button
          full
          onClick={submit}
          disabled={problems.length > 0 || !FACTORY_ADDRESS}
          loading={tx.busy}
          className="mt-2"
        >
          {tx.status === 'wallet'
            ? 'Confirm in Wallet…'
            : tx.status === 'confirming'
              ? 'Deploying Contract On-Chain…'
              : 'Deploy Vault'}
        </Button>
      </div>
    </Sheet>
  )
}
