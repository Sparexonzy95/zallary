import { useState } from 'react'
import { useAccount } from 'wagmi'
import { isAddress, parseEventLogs, type Address } from 'viem'
import { Building2, ShieldCheck, Wallet } from 'lucide-react'
import { factoryAbi } from '@/abi/factoryAbi'
import { FACTORY_ADDRESS } from '@/lib/deployments'
import { shortAddress } from '@/lib/format'
import { useTx } from '@/hooks/useTx'
import { Button, Field, Notice, Sheet } from '@/components/ui'

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
    <Sheet open={open} onClose={onClose} title="Register Institution Vault">
      <div className="space-y-4">
        {/* Banner with Connected Wallet Info */}
        <div className="inner rounded-2xl p-4 flex items-center justify-between bg-white/[0.02] border border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#FE9E15]/10 text-[#FE9E15]">
              <Building2 className="size-5" />
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-white/40 block">Institution</span>
              <strong className="text-sm font-semibold text-white block">Deploy On-Chain Vault</strong>
            </div>
          </div>
          {address && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-xs font-mono text-white/70">
              <Wallet className="size-3.5 text-[#FE9E15]" />
              <span>{shortAddress(address)}</span>
            </div>
          )}
        </div>

        <div className="inner rounded-2xl p-3.5 flex items-start gap-2.5 bg-white/[0.02] border border-white/5">
          <ShieldCheck className="size-4 text-[#38d996] shrink-0 mt-0.5" />
          <p className="text-xs text-white/60 leading-relaxed">
            Deploys an independent, non-custodial smart escrow contract on Circle Arc Testnet. Your wallet receives Administrator and emergency Pauser authorizations.
          </p>
        </div>

        <Field label="Organization / Company Name">
          <input
            className="field"
            value={name}
            maxLength={64}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Acme Treasury Labs"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Protocol Fee" help="Max 5.00%">
            <div className="relative">
              <input
                className="field pr-8 tabular-nums text-right font-mono"
                inputMode="decimal"
                value={feePercent}
                onChange={(e) =>
                  setFeePercent(e.target.value.replace(/[^0-9.]/g, ''))
                }
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-white/40 font-mono">
                %
              </span>
            </div>
          </Field>

          <Field label="Admin Delay (hrs)" help="Security timelock">
            <input
              className="field tabular-nums text-right font-mono"
              inputMode="numeric"
              value={delayHours}
              onChange={(e) =>
                setDelayHours(e.target.value.replace(/[^0-9.]/g, ''))
              }
            />
          </Field>
        </div>

        <Field label="Fee Beneficiary" help="Receives fee at funding">
          <input
            className="field mono text-xs sm:text-sm"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value.trim())}
            placeholder={address ?? '0x… wallet address'}
          />
        </Field>

        <p className="text-[11px] text-white/40 leading-relaxed">
          Defaults to your current wallet address. Protocol disbursement fees are levied on top of payroll amounts when Finance executes funding.
        </p>

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
          className="btn btn-primary min-h-12 text-sm font-semibold mt-2"
        >
          {tx.status === 'wallet'
            ? 'Confirm in Wallet…'
            : tx.status === 'confirming'
              ? 'Deploying Contract On-Chain…'
              : 'Deploy Vault on Arc'}
        </Button>
      </div>
    </Sheet>
  )
}
