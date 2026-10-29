import { useState } from 'react'
import {
  PauseOctagon,
  Percent,
  Play,
  ShieldCheck,
  UserCheck,
  UserMinus,
  UserPlus,
} from 'lucide-react'
import { useAccount, useReadContract, useReadContracts } from 'wagmi'
import { isAddress, type Address } from 'viem'
import { vaultAbi } from '@/abi/vaultAbi'
import { CHAIN_ID } from '@/lib/chain'
import { ROLE, ROLE_HELP, ROLE_LABEL, type MemberRoleKey } from '@/lib/roles'
import { bpsToPercent } from '@/lib/format'
import { useRoleMembers, useSeparateApprover } from '@/hooks/data'
import { useTx } from '@/hooks/useTx'
import { AddressLink, Button, Field, Notice, Skeleton } from '@/components/ui'

interface Props {
  vault: Address
  isAdmin: boolean
}

const EDITABLE: readonly MemberRoleKey[] = ['HR', 'FINANCE', 'RELAYER', 'PAUSER']

function MemberList({
  vault,
  role,
  isAdmin,
}: {
  vault: Address
  role: MemberRoleKey
  isAdmin: boolean
}) {
  const members = useRoleMembers(vault, ROLE[role])
  const tx = useTx()
  const removable = isAdmin && EDITABLE.includes(role)

  return (
    <div className="space-y-3 pb-4 border-b border-white/5 last:border-b-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 pb-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-base text-white font-display">{ROLE_LABEL[role]}</span>
          {members.data && (
            <span className={`status ${role === 'ADMIN' ? 'status-active' : 'status-funding_ready'}`}>
              {members.data.length} {members.data.length === 1 ? 'member' : 'members'}
            </span>
          )}
        </div>
        <span className="text-xs text-white/40">{ROLE_HELP[role]}</span>
      </div>

      {members.isLoading && <Skeleton className="h-12 rounded-xl" />}

      {!members.isLoading && (members.data?.length ?? 0) === 0 && (
        <div className="inner rounded-xl px-4 py-3 text-xs text-white/40 bg-white/[0.02] border border-white/5">
          No addresses currently assigned to this role.
        </div>
      )}

      <ul className="space-y-2">
        {members.data?.map((member) => (
          <li
            key={member}
            className="inner flex items-center justify-between gap-3 rounded-xl px-4 py-2.5 bg-white/[0.02] border border-white/5 transition-all hover:border-white/20"
          >
            <AddressLink address={member} label={`${member.slice(0, 10)}…${member.slice(-8)}`} />
            {removable && (
              <Button
                variant="danger"
                className="btn btn-danger !min-h-9 !px-3 text-xs"
                loading={tx.busy}
                onClick={() =>
                  void tx.run(
                    (write) =>
                      write({
                        address: vault,
                        abi: vaultAbi,
                        functionName: 'revokeRole',
                        args: [ROLE[role], member],
                      }),
                    { success: `${ROLE_LABEL[role]} role revoked on-chain.` },
                  )
                }
              >
                <UserMinus className="size-3.5" /> Revoke
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function GrantRole({ vault }: { vault: Address }) {
  const tx = useTx()
  const [role, setRole] = useState<MemberRoleKey>('HR')
  const [input, setInput] = useState('')
  const valid = isAddress(input)

  const submit = () => {
    if (!isAddress(input)) return
    void tx.run(
      (write) =>
        write({
          address: vault,
          abi: vaultAbi,
          functionName: 'grantRole',
          args: [ROLE[role], input],
        }),
      {
        success: `${ROLE_LABEL[role]} role granted on-chain.`,
        onDone: () => setInput(''),
      },
    )
  }

  return (
    <div className="employer-task-card template-detail-command-panel p-5 sm:p-6 space-y-4 rounded-2xl bg-[#151515] border border-white/10">
      <div className="template-detail-action-strip flex items-center gap-2.5 pb-3 border-b border-white/10">
        <UserPlus className="size-5 text-[#FE9E15]" />
        <div>
          <h3 className="font-bold text-base text-white font-display">Grant Role Authorization</h3>
          <p className="text-xs text-white/50">
            Enforce segregation of duties by delegating HR and Finance to distinct multisig or EOA addresses.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-white/50">Select Role to Grant</span>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Role">
          {EDITABLE.map((key) => {
            const active = role === key
            return (
              <button
                key={key}
                role="radio"
                aria-checked={active}
                onClick={() => setRole(key)}
                className={`filter-tab${active ? ' active' : ''} text-xs uppercase tracking-wider`}
              >
                {ROLE_LABEL[key]}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-1">
        <Field label="Recipient Wallet Address" help="Arc Testnet account or multisig">
          <input
            className="field mono text-xs sm:text-sm"
            value={input}
            onChange={(e) => setInput(e.target.value.trim())}
            placeholder="0x… account address"
            spellCheck={false}
          />
        </Field>
        {input.length > 0 && !valid && (
          <p className="text-xs text-red-400 px-1 font-mono">
            Please enter a valid Ethereum-compatible address.
          </p>
        )}
      </div>

      {tx.error && <Notice tone="bad">{tx.error}</Notice>}

      <Button
        full
        disabled={!valid}
        loading={tx.busy}
        onClick={submit}
        className="btn btn-primary min-h-12 text-sm font-semibold"
      >
        <UserCheck className="size-4" />
        {tx.status === 'wallet'
          ? 'Confirm in Wallet…'
          : tx.status === 'confirming'
            ? 'Granting Authorization…'
            : `Grant ${ROLE_LABEL[role]} Role`}
      </Button>
    </div>
  )
}

function FeeCard({ vault, isAdmin }: Props) {
  const tx = useTx()
  const [percent, setPercent] = useState('')
  const [recipient, setRecipient] = useState('')
  const read = useReadContracts({
    allowFailure: false,
    query: { refetchInterval: 15_000 },
    contracts: [
      { address: vault, abi: vaultAbi, functionName: 'feeBps', chainId: CHAIN_ID },
      { address: vault, abi: vaultAbi, functionName: 'feeRecipient', chainId: CHAIN_ID },
    ],
  })
  const [feeBps, feeRecipient] = read.data ?? []
  const bps = Math.round(Number(percent) * 100)
  const target = recipient || feeRecipient
  const valid =
    percent !== '' &&
    bps >= 0 &&
    bps <= 500 &&
    typeof target === 'string' &&
    isAddress(target)

  const save = () => {
    if (!valid || typeof target !== 'string' || !isAddress(target)) return
    void tx.run(
      (write) =>
        write({
          address: vault,
          abi: vaultAbi,
          functionName: 'setProtocolFee',
          args: [BigInt(bps), target],
        }),
      {
        success: 'Protocol fee parameters updated on-chain.',
        onDone: () => setPercent(''),
      },
    )
  }

  return (
    <div className="employer-task-card p-5 sm:p-6 space-y-4 rounded-2xl bg-[#151515] border border-white/10">
      <div className="template-detail-action-strip flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <Percent className="size-5 text-[#FE9E15]" />
          <h3 className="font-bold text-base text-white font-display">Protocol Disbursement Fee</h3>
        </div>
        {typeof feeBps === 'bigint' && (
          <span className="status status-funding_ready font-mono">{bpsToPercent(feeBps)} on funding</span>
        )}
      </div>

      <p className="text-xs text-white/50 leading-relaxed">
        Calculated and added at funding execution. Deducted from the Finance wallet and forwarded directly to the configured recipient (capped at 5%).
      </p>

      {typeof feeRecipient === 'string' && (
        <div className="inner flex flex-wrap items-center justify-between gap-2 rounded-xl p-3 text-xs bg-white/[0.02] border border-white/5 font-mono">
          <span className="text-white/40">Fee Beneficiary:</span>
          <AddressLink address={feeRecipient} />
        </div>
      )}

      {isAdmin && (
        <div className="space-y-3 pt-2">
          <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
            <Field label="Rate (%)" help="Max 5.00%">
              <input
                className="field tabular-nums text-right"
                inputMode="decimal"
                value={percent}
                onChange={(e) => setPercent(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder="0.25"
              />
            </Field>
            <Field label="Beneficiary Address" help="Leave blank to retain current">
              <input
                className="field mono text-xs sm:text-sm"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value.trim())}
                placeholder="Keep existing"
              />
            </Field>
          </div>

          <Button
            variant="ghost"
            full
            disabled={!valid}
            loading={tx.busy}
            onClick={save}
            className="btn btn-secondary min-h-11 text-xs font-semibold"
          >
            Update Fee Policy
          </Button>
        </div>
      )}
    </div>
  )
}

function SeparateApproverCard({ vault, isAdmin }: Props) {
  const tx = useTx()
  const separate = useSeparateApprover(vault)
  if (!separate.supported) return null
  const next = !separate.enforced

  return (
    <div className="employer-task-card p-5 sm:p-6 space-y-3 rounded-2xl bg-[#151515] border border-white/10">
      <div className="template-detail-action-strip flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="size-5 text-[#FE9E15]" />
          <h3 className="font-bold text-base text-white font-display">Maker-Checker Policy</h3>
        </div>
        <span className={`status ${separate.enforced ? 'status-active' : 'status-funding_ready'}`}>
          {separate.enforced ? 'Enforced' : 'Relaxed'}
        </span>
      </div>

      <p className="text-xs text-white/50 leading-relaxed">
        {separate.enforced
          ? 'Strict governance: The Finance wallet that funds a payroll cannot be the HR account that prepared it. Dual-role atomic funding is disabled.'
          : 'Relaxed governance: Any Finance authorization can fund any draft, including self-drafted rosters.'}
      </p>

      {isAdmin && (
        <div className="pt-2">
          {tx.error && <Notice tone="bad">{tx.error}</Notice>}
          <Button
            variant="ghost"
            full
            loading={tx.busy}
            onClick={() =>
              void tx.run(
                (write) =>
                  write({
                    address: vault,
                    abi: vaultAbi,
                    functionName: 'setRequireSeparateApprover',
                    args: [next],
                  }),
                {
                  success: next
                    ? 'Maker-checker policy enforced.'
                    : 'Maker-checker policy relaxed.',
                },
              )
            }
            className="btn btn-secondary min-h-11 text-xs font-semibold"
          >
            {next
              ? 'Enable Strict Maker-Checker Separation'
              : 'Allow Single-Wallet Preparation & Funding'}
          </Button>
        </div>
      )}
    </div>
  )
}

function PauseCard({ vault }: { vault: Address }) {
  const { address } = useAccount()
  const tx = useTx()
  const paused = useReadContract({
    address: vault,
    abi: vaultAbi,
    functionName: 'paused',
    chainId: CHAIN_ID,
    query: { refetchInterval: 10_000 },
  })
  const pauser = useReadContract({
    address: vault,
    abi: vaultAbi,
    functionName: 'hasRole',
    args: [ROLE.PAUSER, address ?? vault],
    chainId: CHAIN_ID,
    query: { enabled: Boolean(address) },
  })
  const isPaused = paused.data === true

  return (
    <div className="employer-task-card p-5 sm:p-6 space-y-3 rounded-2xl bg-[#151515] border border-white/10">
      <div className="template-detail-action-strip flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <PauseOctagon className="size-5 text-red-500" />
          <h3 className="font-bold text-base text-white font-display">Emergency Circuit Breaker</h3>
        </div>
        <span className={`status ${isPaused ? 'status-failed' : 'status-active'}`}>
          {isPaused ? 'Vault Paused' : 'Operational'}
        </span>
      </div>

      <p className="text-xs text-white/50 leading-relaxed">
        Pausing halts new payroll drafting, funding, employee claims, and refunds across the vault until resumed by an authorized Pauser.
      </p>

      {tx.error && <Notice tone="bad">{tx.error}</Notice>}

      {pauser.data === true ? (
        <div className="pt-2">
          <Button
            variant={isPaused ? 'primary' : 'danger'}
            full
            loading={tx.busy}
            onClick={() =>
              void tx.run(
                (write) =>
                  write({
                    address: vault,
                    abi: vaultAbi,
                    functionName: isPaused ? 'unpause' : 'pause',
                  }),
                { success: isPaused ? 'Vault resumed operational status.' : 'Vault paused.' },
              )
            }
            className={`btn ${isPaused ? 'btn-primary' : 'btn-danger'} min-h-11 text-xs font-semibold`}
          >
            {isPaused ? (
              <>
                <Play className="size-4" /> Resume Vault Operations
              </>
            ) : (
              <>
                <PauseOctagon className="size-4" /> Trigger Emergency Pause
              </>
            )}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-white/40 pt-1">
          Only wallets granted the Pauser role can toggle the emergency circuit breaker.
        </p>
      )}
    </div>
  )
}

/** Role assignment and member lists. */
export function RolesSection({ vault, isAdmin }: Props) {
  return (
    <div className="space-y-6">
      {isAdmin && <GrantRole vault={vault} />}
      <div className="employer-task-card p-5 sm:p-6 space-y-6 rounded-2xl bg-[#151515] border border-white/10">
        {(['ADMIN', 'HR', 'FINANCE', 'RELAYER', 'PAUSER'] as const).map((role) => (
          <MemberList key={role} vault={vault} role={role} isAdmin={isAdmin} />
        ))}
      </div>
    </div>
  )
}

/** Approval rule, fee and emergency pause. */
export function PoliciesSection({ vault, isAdmin }: Props) {
  return (
    <div className="space-y-6">
      <SeparateApproverCard vault={vault} isAdmin={isAdmin} />
      <FeeCard vault={vault} isAdmin={isAdmin} />
      <PauseCard vault={vault} />
    </div>
  )
}
