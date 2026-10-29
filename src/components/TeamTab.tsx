import { useState } from 'react'
import {
  CheckCircle2,
  Landmark,
  PauseOctagon,
  Percent,
  Play,
  ShieldCheck,
  UserCheck,
  UserMinus,
  UserPlus,
  UsersRound,
} from 'lucide-react'
import { useAccount, useReadContract, useReadContracts } from 'wagmi'
import { isAddress, type Address } from 'viem'
import { vaultAbi } from '@/abi/vaultAbi'
import { CHAIN_ID } from '@/lib/chain'
import { ROLE, ROLE_LABEL, type MemberRoleKey } from '@/lib/roles'
import { bpsToPercent, shortAddress } from '@/lib/format'
import { useRoleMembers, useSeparateApprover } from '@/hooks/data'
import { useTx } from '@/hooks/useTx'
import { Button, Field, Notice, Skeleton, StatusBadge } from '@/components/ui'

interface Props {
  vault: Address
  isAdmin: boolean
}

const EDITABLE: readonly MemberRoleKey[] = ['HR', 'FINANCE', 'RELAYER', 'PAUSER']

const ROLE_DESCRIPTIONS: Record<MemberRoleKey, string> = {
  HR: 'Draft employee rosters, set allocations, and submit batches for Finance audit.',
  FINANCE: 'Audit immutable payroll drafts, deposit USDC escrow, and reclaim refunds.',
  PAUSER: 'Authorize emergency circuit breaker pauses across the entire vault.',
  RELAYER: 'Automated on-chain batch submissions and relayer operations.',
  ADMIN: 'Master administrator with timelocked governance transition authority.',
}

function RoleMembersList({
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

  if (members.isLoading) {
    return <Skeleton className="h-16 rounded-xl" />
  }

  const list = members.data ?? []

  if (list.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      {list.map((member) => (
        <div key={member} className="institution-member-row">
          <span className="institution-member-icon">
            {role === 'ADMIN' ? (
              <ShieldCheck size={16} className="text-[#FE9E15]" />
            ) : role === 'HR' ? (
              <UsersRound size={16} className="text-[#38d996]" />
            ) : role === 'FINANCE' ? (
              <Landmark size={16} className="text-[#FE9E15]" />
            ) : (
              <PauseOctagon size={16} className="text-red-400" />
            )}
          </span>

          <span className="institution-member-copy">
            <strong>{ROLE_LABEL[role]}</strong>
            <span className="font-mono text-xs text-white/50">{shortAddress(member)}</span>
          </span>

          <div className="flex items-center gap-2">
            <StatusBadge value={role === 'ADMIN' ? 'active' : 'funding_ready'} />
            {removable && (
              <Button
                variant="danger"
                className="btn btn-danger !min-h-8 !py-1 text-xs px-2.5 ml-1 font-semibold"
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
          </div>
        </div>
      ))}
    </div>
  )
}

function GrantRoleWizard({ vault }: { vault: Address }) {
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
        success: `${ROLE_LABEL[role]} role granted on-chain!`,
        onDone: () => setInput(''),
      },
    )
  }

  return (
    <div className="employer-task-card template-detail-command-panel p-5 sm:p-6 space-y-5 rounded-2xl bg-[#151515] border border-white/10">
      <div className="template-detail-action-strip flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <UserPlus className="size-5 text-[#FE9E15]" />
          <div>
            <h3 className="font-bold text-base text-white font-display">Assign New Role</h3>
            <p className="text-xs text-white/50">
              Enforce segregation of duties by assigning HR and Finance to distinct wallets.
            </p>
          </div>
        </div>
        <span className="employer-task-count font-mono text-xs">Admin Action</span>
      </div>

      {/* Role Choice Cards */}
      <div className="space-y-2">
        <span className="text-xs font-mono uppercase tracking-wider text-white/50 block">1. Select Responsibility</span>
        <div className="role-choice-grid grid grid-cols-1 sm:grid-cols-2 gap-3">
          {EDITABLE.map((key) => {
            const active = role === key
            return (
              <button
                type="button"
                key={key}
                className={`role-choice-card${active ? ' active' : ''}`}
                onClick={() => setRole(key)}
              >
                <span className="role-choice-icon">
                  {key === 'HR' ? (
                    <UsersRound size={17} />
                  ) : key === 'FINANCE' ? (
                    <Landmark size={17} />
                  ) : key === 'PAUSER' ? (
                    <PauseOctagon size={17} />
                  ) : (
                    <Play size={17} />
                  )}
                </span>
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <strong className="text-sm font-semibold text-white block">{ROLE_LABEL[key]}</strong>
                    {active && <span className="status status-funding_ready !py-0.5 !px-1.5 text-[10px]">Selected</span>}
                  </div>
                  <small className="text-xs text-white/50 block line-clamp-2">{ROLE_DESCRIPTIONS[key]}</small>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Wallet Input */}
      <div className="space-y-2 pt-1">
        <span className="text-xs font-mono uppercase tracking-wider text-white/50 block">2. Officer Account</span>
        <Field label={`${ROLE_LABEL[role]} Wallet Address`} help="Arc Testnet account or multisig">
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

      <div className="role-access-note">
        Delegated {ROLE_LABEL[role]} permissions activate for this officer once signed on Circle Arc Testnet.
      </div>

      {tx.error && <Notice tone="bad">{tx.error}</Notice>}

      <div className="pt-2 flex justify-end">
        <Button
          disabled={!valid}
          loading={tx.busy}
          onClick={submit}
          className="btn btn-primary min-h-11 text-xs px-5 font-semibold"
        >
          <UserCheck className="size-4" />
          {tx.status === 'wallet'
            ? 'Confirm in Wallet…'
            : tx.status === 'confirming'
              ? 'Confirming on Arc…'
              : `Assign ${ROLE_LABEL[role]} Role`}
        </Button>
      </div>
    </div>
  )
}

function SeparateApproverCard({ vault, isAdmin }: Props) {
  const tx = useTx()
  const separate = useSeparateApprover(vault)
  if (!separate.supported) return null
  const next = !separate.enforced

  return (
    <div className="employer-task-card template-detail-command-panel p-5 sm:p-6 space-y-4 rounded-2xl bg-[#151515] border border-white/10">
      <div className="template-detail-action-strip flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="size-5 text-[#FE9E15]" />
          <div>
            <h3 className="font-bold text-base text-white font-display">Maker-Checker Segregation Policy</h3>
            <p className="text-xs text-white/50">
              Institutional fraud prevention rule enforcing distinct HR and Finance signatories.
            </p>
          </div>
        </div>
        <span className={`status ${separate.enforced ? 'status-active' : 'status-funding_ready'}`}>
          {separate.enforced ? 'Enforced' : 'Relaxed'}
        </span>
      </div>

      <p className="text-xs text-white/60 leading-relaxed">
        {separate.enforced
          ? 'Strict governance enabled: The Finance wallet that executes funding cannot be the same address that drafted the payroll. Dual-role atomic execution is disabled.'
          : 'Relaxed governance: Any account with Finance authority can fund any draft, including rosters prepared by the same account.'}
      </p>

      {isAdmin && (
        <div className="pt-2 flex justify-end">
          {tx.error && <Notice tone="bad">{tx.error}</Notice>}
          <Button
            variant="ghost"
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
                    ? 'Maker-checker policy strictly enforced on-chain.'
                    : 'Maker-checker policy relaxed.',
                },
              )
            }
            className="btn btn-secondary min-h-11 text-xs px-5 font-semibold"
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
    <div className="employer-task-card template-detail-command-panel p-5 sm:p-6 space-y-4 rounded-2xl bg-[#151515] border border-white/10">
      <div className="template-detail-action-strip flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <Percent className="size-5 text-[#FE9E15]" />
          <div>
            <h3 className="font-bold text-base text-white font-display">Protocol Disbursement Fee</h3>
            <p className="text-xs text-white/50">
              Levied on top of gross payroll volume upon Finance funding execution (capped at 5%).
            </p>
          </div>
        </div>
        {typeof feeBps === 'bigint' && (
          <span className="status status-funding_ready font-mono">{bpsToPercent(feeBps)} at funding</span>
        )}
      </div>

      {typeof feeRecipient === 'string' && (
        <div className="inner flex flex-wrap items-center justify-between gap-2 rounded-xl p-3 text-xs bg-white/[0.02] border border-white/5 font-mono">
          <span className="text-white/40">Configured Fee Beneficiary:</span>
          <span className="text-white font-semibold">{shortAddress(feeRecipient)}</span>
        </div>
      )}

      {isAdmin && (
        <div className="space-y-4 pt-2">
          <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
            <Field label="New Rate (%)" help="Max 5.00%">
              <input
                className="field tabular-nums text-right font-mono"
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
                placeholder="Keep existing address"
              />
            </Field>
          </div>

          <div className="flex justify-end">
            <Button
              variant="ghost"
              disabled={!valid}
              loading={tx.busy}
              onClick={save}
              className="btn btn-secondary min-h-11 text-xs px-5 font-semibold"
            >
              Update Fee Policy
            </Button>
          </div>
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
    <div className="employer-task-card template-detail-command-panel p-5 sm:p-6 space-y-4 rounded-2xl bg-[#151515] border border-white/10">
      <div className="template-detail-action-strip flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <PauseOctagon className="size-5 text-red-500" />
          <div>
            <h3 className="font-bold text-base text-white font-display">Emergency Circuit Breaker</h3>
            <p className="text-xs text-white/50">
              Freezes payroll preparations, fundings, claims, and treasury distributions in an emergency.
            </p>
          </div>
        </div>
        <span className={`status ${isPaused ? 'status-failed' : 'status-active'}`}>
          {isPaused ? 'Vault Paused' : 'Operational'}
        </span>
      </div>

      <p className="text-xs text-white/60 leading-relaxed">
        {isPaused
          ? 'The vault is currently PAUSED. All state mutations are rejected by the smart contract until unpaused.'
          : 'All smart contract functions are active. In case of suspected security compromise, authorized Pausers can halt activity immediately.'}
      </p>

      {tx.error && <Notice tone="bad">{tx.error}</Notice>}

      {pauser.data === true ? (
        <div className="pt-2 flex justify-end">
          <Button
            variant={isPaused ? 'primary' : 'danger'}
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
            className={`btn ${isPaused ? 'btn-primary' : 'btn-danger'} min-h-11 text-xs px-5 font-semibold`}
          >
            {isPaused ? (
              <>
                <Play className="size-4" /> Resume Operations
              </>
            ) : (
              <>
                <PauseOctagon className="size-4" /> Trigger Emergency Pause
              </>
            )}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-white/40 pt-1 font-mono">
          Connected wallet does not hold the Pauser role.
        </p>
      )}
    </div>
  )
}

/** Role assignment and member lists. */
export function RolesSection({ vault, isAdmin }: Props) {
  const hrMembers = useRoleMembers(vault, ROLE.HR)
  const financeMembers = useRoleMembers(vault, ROLE.FINANCE)
  const separate = useSeparateApprover(vault)

  return (
    <div className="space-y-6">
      {/* ─── Governance Overview Cards ─── */}
      <div className="role-complete-panel p-5 rounded-2xl bg-[#151515] border border-white/10 space-y-5">
        <div className="role-complete-head flex items-start gap-3 pb-3 border-b border-white/10">
          <span className="role-complete-icon mt-0.5">
            <CheckCircle2 size={18} />
          </span>
          <div>
            <span>Institution Governance</span>
            <h2>Active Roles & Delegations</h2>
            <p>
              Manage authorized keyholders across payroll preparation, treasury funding, and emergency controls.
            </p>
          </div>
        </div>

        <div className="role-complete-grid">
          <div className="role-complete-card">
            <span>HR Officers</span>
            <strong>{hrMembers.data?.length ?? 0} active</strong>
          </div>
          <div className="role-complete-card">
            <span>Finance Officers</span>
            <strong>{financeMembers.data?.length ?? 0} active</strong>
          </div>
          <div className="role-complete-card">
            <span>Maker-Checker</span>
            <strong className={separate.enforced ? 'text-[#38d996]' : 'text-[#FE9E15]'}>
              {separate.enforced ? 'Enforced' : 'Relaxed'}
            </strong>
          </div>
        </div>
      </div>

      {/* ─── Role Wizard (Admin Only) ─── */}
      {isAdmin && <GrantRoleWizard vault={vault} />}

      {/* ─── Authorized Members List ─── */}
      <div className="employer-task-card template-detail-command-panel p-5 sm:p-6 space-y-4 rounded-2xl bg-[#151515] border border-white/10">
        <div className="template-detail-action-strip flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3 className="font-bold text-base text-white font-display">Authorized Directory</h3>
            <p className="text-xs text-white/50">All wallets currently holding on-chain governance or operational permissions.</p>
          </div>
        </div>

        <div className="space-y-3">
          {(['ADMIN', 'HR', 'FINANCE', 'PAUSER', 'RELAYER'] as const).map((role) => (
            <RoleMembersList key={role} vault={vault} role={role} isAdmin={isAdmin} />
          ))}
        </div>
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
