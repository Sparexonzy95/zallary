import React, { useState } from 'react'
import { useAccount } from 'wagmi'
import { isAddress, parseEventLogs, type Address } from 'viem'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Send,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import { factoryAbi } from '@/abi/factoryAbi'
import { FACTORY_ADDRESS } from '@/lib/deployments'
import { shortAddress } from '@/lib/format'
import { useTx } from '@/hooks/useTx'
import { Button, Card, Field, Notice } from '@/components/ui'

interface Props {
  onCreated: (vault: Address) => void
  onBack?: () => void
}

export function RegisterInstitutionPage({ onCreated, onBack }: Props) {
  const { address, isConnected } = useAccount()
  const tx = useTx()

  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [name, setName] = useState('')
  const [recipient, setRecipient] = useState('')
  const [feePercent, setFeePercent] = useState('0.25')
  const [delayHours, setDelayHours] = useState('24')

  const feeRecipient = recipient.trim() || address || ''
  const feeBps = Math.round(Number(feePercent) * 100)
  const delayNumber = Number(delayHours)

  const nameValid = name.trim().length > 0 && name.trim().length <= 64
  const feeValid = Number.isFinite(feeBps) && feeBps >= 0 && feeBps <= 500
  const delayValid = Number.isFinite(delayNumber) && delayNumber >= 0
  const recipientValid = isAddress(feeRecipient)
  const detailsReady = nameValid && feeValid && delayValid && recipientValid

  const activeStepCopy = [
    { label: 'Step 01', title: 'Wallet verified' },
    { label: 'Step 02', title: 'Institution profile' },
    { label: 'Step 03', title: 'Review & deploy on Arc' },
  ][step]

  const deploy = () => {
    const factory = FACTORY_ADDRESS
    if (!factory || !detailsReady || !isAddress(feeRecipient)) return

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
        success: 'Institution Company Vault deployed on Arc Testnet!',
        onDone: (receipt) => {
          const [created] = parseEventLogs({
            abi: factoryAbi,
            logs: receipt.logs,
            eventName: 'CompanyCreated',
          })
          if (created) {
            onCreated(created.args.vault)
          }
        },
      },
    )
  }

  return (
    <div className="onboarding-page employer-onboarding-page dashboard-shell">
      {/* ─── Header ─── */}
      <div className="employer-onboarding-head">
        <div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="template-detail-back-link inline-flex items-center gap-1.5 text-xs font-semibold text-white/50 hover:text-white transition-colors mb-2"
            >
              <ArrowLeft size={14} />
              <span>Back to Directory</span>
            </button>
          )}
          <div className="employer-kicker">Institution</div>
          <h1>Register institution</h1>
          <p>
            Deploy an institutional payroll escrow vault on Circle Arc Testnet.
          </p>
        </div>

        <div className="employer-onboarding-side">
          <div className="employer-onboarding-wallet">
            <span className="employer-onboarding-wallet-icon" aria-label="Wallet icon">
              <Wallet size={16} />
            </span>
            <strong>{address ? shortAddress(address) : 'Not connected'}</strong>
            <span className="employer-onboarding-network">Arc Testnet</span>
          </div>
        </div>
      </div>

      {/* ─── Carousel Flow ─── */}
      <div className="employer-onboarding-carousel">
        <div className="employer-onboarding-flow-top">
          <div className="employer-onboarding-flow-copy">
            <span>{activeStepCopy.label}</span>
            <h2>{activeStepCopy.title}</h2>
          </div>
          <div className="employer-onboarding-flow-count">
            Step {step + 1} of 3
          </div>
        </div>

        <div className="employer-onboarding-status" aria-label="Institution registration progress">
          {([
            { number: '01', title: 'Wallet', caption: 'Verified', idx: 0 as const },
            { number: '02', title: 'Profile', caption: 'Vault details', idx: 1 as const },
            { number: '03', title: 'On-chain', caption: 'Arc Testnet', idx: 2 as const },
          ]).map((s) => {
            const active = s.idx === step
            const complete =
              s.idx === 0
                ? isConnected
                : s.idx === 1
                  ? detailsReady
                  : tx.status === 'success'

            return (
              <button
                key={s.number}
                type="button"
                className={`employer-onboarding-status-item${active ? ' active' : ''}${complete ? ' complete' : ''}`}
                onClick={() => setStep(s.idx)}
                aria-current={active ? 'step' : undefined}
              >
                <span>{complete ? <Check size={13} strokeWidth={2} /> : s.number}</span>
                <strong>{s.title}</strong>
                <small>{s.caption}</small>
              </button>
            )
          })}
        </div>

        <div className="employer-onboarding-carousel-viewport">
          <div
            className="employer-onboarding-carousel-track"
            style={{ transform: `translateX(-${step * 100}%)` }}
          >
            {/* ─── Slide 1: Wallet Verification ─── */}
            <div className="employer-onboarding-slide">
              <Card
                className="employer-onboarding-card employer-onboarding-wallet-verified-card"
                title="Wallet verified"
                subtitle="This wallet is attached to your Zalary institution workspace."
                actions={
                  <div className="employer-onboarding-wallet-card">
                    <strong>{address ? shortAddress(address) : 'Not Connected'}</strong>
                    <span className="employer-onboarding-wallet-icon" aria-label="Verified wallet">
                      <Wallet size={18} strokeWidth={1.8} aria-hidden="true" />
                    </span>
                  </div>
                }
              >
                <div className="inner rounded-2xl p-4 flex items-start gap-3 bg-white/[0.02] border border-white/5 text-xs text-white/60 leading-relaxed my-4">
                  <ShieldCheck className="size-4 text-[#38d996] shrink-0 mt-0.5" />
                  <span>
                    Smart vaults are fully decentralized and non-custodial. As creator, you retain governance controls and can delegate HR and Finance operational roles to separate keyholders.
                  </span>
                </div>

                <div className="employer-onboarding-slide-actions pt-2 flex justify-end">
                  <Button
                    type="button"
                    disabled={!isConnected}
                    onClick={() => setStep(1)}
                    className="btn btn-primary"
                  >
                    Continue to Profile
                    <ArrowRight size={15} strokeWidth={1.8} />
                  </Button>
                </div>
              </Card>
            </div>

            {/* ─── Slide 2: Institution Profile ─── */}
            <div className="employer-onboarding-slide">
              <Card
                className="employer-onboarding-card"
                title="Institution profile"
                subtitle="Treasury parameters and timelock settings for payroll operations."
              >
                <div className="form-stack my-4">
                  <Field label="Institution name">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Acme Inc."
                      required
                      maxLength={64}
                    />
                  </Field>

                  <Field label="Protocol disbursement fee (%)" help="0.00% to 5.00% levied on gross payroll at funding">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="5"
                      value={feePercent}
                      onChange={(e) => setFeePercent(e.target.value)}
                      placeholder="0.25"
                      required
                    />
                  </Field>

                  <Field label="Security timelock delay (hours)" help="Timelocked governance transition delay">
                    <input
                      type="number"
                      min="0"
                      value={delayHours}
                      onChange={(e) => setDelayHours(e.target.value)}
                      placeholder="24"
                      required
                    />
                  </Field>

                  <Field label="Fee beneficiary wallet" help="Address receiving protocol fees upon funding">
                    <input
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value.trim())}
                      placeholder={address ?? '0x...'}
                      spellCheck={false}
                    />
                  </Field>
                </div>

                <div className="employer-onboarding-slide-actions pt-2 flex items-center justify-between">
                  <Button type="button" variant="secondary" onClick={() => setStep(0)}>
                    <ArrowLeft size={15} strokeWidth={1.8} />
                    Back
                  </Button>
                  <Button
                    type="button"
                    disabled={!detailsReady}
                    onClick={() => setStep(2)}
                    className="btn btn-primary"
                  >
                    Review Registration
                    <ArrowRight size={15} strokeWidth={1.8} />
                  </Button>
                </div>
              </Card>
            </div>

            {/* ─── Slide 3: Review & Submit ─── */}
            <div className="employer-onboarding-slide">
              <Card
                className="employer-onboarding-card"
                title="Submit registration"
                subtitle="Zalary prepares the transaction and your wallet signs it on Circle Arc."
              >
                <div className="form-stack my-4">
                  <div className="create-payroll-review-list">
                    <div className="review-row">
                      <span>Institution</span>
                      <strong>{name || 'Not set'}</strong>
                    </div>
                    <div className="review-row">
                      <span>Admin wallet</span>
                      <strong>{address ? shortAddress(address) : 'Not connected'}</strong>
                    </div>
                    <div className="review-row">
                      <span>Fee beneficiary</span>
                      <strong>{shortAddress(feeRecipient)}</strong>
                    </div>
                    <div className="review-row">
                      <span>Protocol fee</span>
                      <strong>{feePercent}%</strong>
                    </div>
                    <div className="review-row">
                      <span>Security delay</span>
                      <strong>{delayHours} Hours</strong>
                    </div>
                    <div className="review-row">
                      <span>Settlement network</span>
                      <strong className="text-[#38d996]">Circle Arc Testnet (USDC)</strong>
                    </div>
                  </div>
                </div>

                {tx.error && <Notice tone="bad">{tx.error}</Notice>}

                <div className="employer-onboarding-slide-actions pt-2 flex items-center justify-between">
                  <Button type="button" variant="secondary" onClick={() => setStep(1)} disabled={tx.busy}>
                    <ArrowLeft size={15} strokeWidth={1.8} />
                    Back
                  </Button>
                  <Button
                    type="button"
                    disabled={!detailsReady || tx.busy}
                    loading={tx.busy}
                    onClick={deploy}
                    className="btn btn-primary"
                  >
                    <Send size={15} strokeWidth={1.8} />
                    {tx.status === 'wallet'
                      ? 'Confirm in Wallet…'
                      : tx.status === 'confirming'
                        ? 'Deploying on Arc…'
                        : 'Register with wallet'}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
