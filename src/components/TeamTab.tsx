import { useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Landmark,
  PauseOctagon,
  Play,
  ShieldCheck,
  UserCheck,
  UserMinus,
  UsersRound,
} from 'lucide-react'
import { isAddress, type Address } from 'viem'
import { vaultAbi } from '@/abi/vaultAbi'
import { ROLE, ROLE_LABEL, type MemberRoleKey } from '@/lib/roles'
import { shortAddress } from '@/lib/format'
import { useRoleMembers } from '@/hooks/data'
import { useTx } from '@/hooks/useTx'
import { Button, Field, Notice, Skeleton, StatusBadge } from '@/components/ui'

interface Props {
  vault: Address
  isAdmin: boolean
}

const EDITABLE: readonly MemberRoleKey[] = ['HR', 'FINANCE', 'PAUSER', 'RELAYER']

const ROLE_DESCRIPTIONS: Record<MemberRoleKey, string> = {
  HR: 'Draft employee rosters, set USDC allocations, and prepare payroll batches for Finance.',
  FINANCE: 'Audit immutable payroll drafts, deposit USDC escrow, and reclaim refunds.',
  PAUSER: 'Authorize emergency pauses across the entire vault.',
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
  if (list.length === 0) return null

  return (
    <div className="space-y-2">
      {list.map((member) => (
        <div key={`${role}-${member}`} className="institution-member-row">
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

function RoleAssignmentWizard({
  vault,
  onComplete,
}: {
  vault: Address
  onComplete: () => void
}) {
  const tx = useTx()
  const [role, setRole] = useState<MemberRoleKey>('HR')
  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [input, setInput] = useState('')
  const valid = isAddress(input)

  const steps = [
    { title: 'Role', caption: ROLE_LABEL[role] },
    { title: 'Wallet', caption: valid ? shortAddress(input) : 'Target Address' },
    { title: 'Submit', caption: 'On-chain' },
  ]

  const submit = () => {
    if (!valid) return
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
        onDone: () => {
          setInput('')
          onComplete()
        },
      },
    )
  }

  return (
    <div className="template-detail-command-panel p-5 sm:p-6 space-y-5 rounded-2xl bg-[#151515] border border-white/10">
      <div className="institution-panel-head">
        <div>
          <span className="institution-panel-kicker">Role Delegation</span>
          <h2>Assign New Role</h2>
        </div>
        <button
          type="button"
          className="btn btn-secondary !min-h-9 !py-1 text-xs px-3 font-semibold flex items-center gap-1.5"
          onClick={onComplete}
        >
          <ArrowLeft size={14} /> Back to Directory
        </button>
      </div>

      <div className="role-assignment-steps" aria-label="Role assignment progress">
        {steps.map((s, index) => {
          const stepIndex = index as 0 | 1 | 2
          const active = step === stepIndex
          const complete = step > stepIndex
          return (
            <button
              type="button"
              key={s.title}
              className={`role-assignment-step${active ? ' active' : ''}${complete ? ' complete' : ''}`}
              onClick={() => {
                if (stepIndex === 2 && !valid) return
                setStep(stepIndex)
              }}
              disabled={stepIndex === 2 && !valid}
            >
              <span>{complete ? <Check size={13} strokeWidth={2.2} /> : `0${index + 1}`}</span>
              <strong>{s.title}</strong>
              <small>{s.caption}</small>
            </button>
          )
        })}
      </div>

      {step === 0 && (
        <div className="role-assignment-panel space-y-4">
          <div className="role-assignment-panel-head">
            <span>Step 1 of 3</span>
            <h2>Select Responsibility</h2>
          </div>
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
                    <strong className="text-sm font-semibold text-white block">{ROLE_LABEL[key]}</strong>
                    <small className="text-xs text-white/50 block line-clamp-2">{ROLE_DESCRIPTIONS[key]}</small>
                  </div>
                </button>
              )
            })}
          </div>
          <div className="pt-2 flex justify-end">
            <Button
              type="button"
              className="btn btn-primary min-h-10 text-xs px-5 font-semibold flex items-center gap-1.5"
              onClick={() => setStep(1)}
            >
              Continue to Wallet <ArrowRight size={14} />
            </Button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="role-assignment-panel space-y-4">
          <div className="role-assignment-panel-head">
            <span>Step 2 of 3</span>
            <h2>Enter Officer Wallet Address</h2>
          </div>
          <Field label={`${ROLE_LABEL[role]} Wallet Address`} help="Circle Arc account or corporate multisig">
            <input
              className="field mono text-xs sm:text-sm"
              value={input}
              onChange={(e) => setInput(e.target.value.trim())}
              placeholder="0x… account address"
              spellCheck={false}
              autoFocus
            />
          </Field>
          {input.length > 0 && !valid && (
            <p className="text-xs text-red-400 font-mono">
              Please enter a valid Ethereum-compatible account address.
            </p>
          )}
          <div className="role-access-note">
            Delegated {ROLE_LABEL[role]} permissions will be cryptographically registered on Circle Arc.
          </div>
          <div className="pt-2 flex justify-between items-center">
            <Button
              type="button"
              variant="secondary"
              className="btn btn-secondary min-h-10 text-xs px-4 font-semibold"
              onClick={() => setStep(0)}
            >
              <ArrowLeft size={14} /> Back
            </Button>
            <Button
              type="button"
              disabled={!valid}
              className="btn btn-primary min-h-10 text-xs px-5 font-semibold flex items-center gap-1.5"
              onClick={() => setStep(2)}
            >
              Review Assignment <ArrowRight size={14} />
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="role-assignment-panel space-y-4">
          <div className="role-assignment-panel-head">
            <span>Step 3 of 3</span>
            <h2>Review & Submit On-Chain</h2>
          </div>
          <div className="create-payroll-review-list">
            <div className="review-row">
              <span>Role Delegation</span>
              <strong>{ROLE_LABEL[role]}</strong>
            </div>
            <div className="review-row">
              <span>Officer Wallet</span>
              <strong className="font-mono">{shortAddress(input)}</strong>
            </div>
            <div className="review-row">
              <span>Network</span>
              <strong className="text-[#38d996]">Circle Arc</strong>
            </div>
            <div className="review-row">
              <span>Authorization</span>
              <strong>Institution Admin</strong>
            </div>
          </div>

          {tx.error && <Notice tone="bad">{tx.error}</Notice>}

          <div className="pt-2 flex justify-between items-center">
            <Button
              type="button"
              variant="secondary"
              className="btn btn-secondary min-h-10 text-xs px-4 font-semibold"
              onClick={() => setStep(1)}
              disabled={tx.busy}
            >
              <ArrowLeft size={14} /> Edit Address
            </Button>
            <Button
              disabled={!valid}
              loading={tx.busy}
              onClick={submit}
              className="btn btn-primary min-h-11 text-xs px-6 font-semibold"
            >
              <UserCheck className="size-4" />
              {tx.status === 'wallet'
                ? 'Confirm in Wallet…'
                : tx.status === 'confirming'
                  ? 'Confirming on Arc…'
                  : `Assign ${ROLE_LABEL[role]} on Arc`}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Pure Institution Governance view matching Zalary's authentic layout. */
export function TeamTab({ vault, isAdmin }: Props) {
  const [showWizard, setShowWizard] = useState(false)

  return (
    <div className="space-y-6">
      {/* ─── Active Access / Roles Directory ─── */}
      {showWizard && isAdmin ? (
        <RoleAssignmentWizard
          vault={vault}
          onComplete={() => setShowWizard(false)}
        />
      ) : (
        <section className="template-detail-command-panel institution-profile-panel p-5 sm:p-6 space-y-4 rounded-2xl bg-[#151515] border border-white/10">
          <div className="institution-panel-head">
            <div>
              <span className="institution-panel-kicker">Members</span>
              <h2>Active Access</h2>
            </div>
            {isAdmin && (
              <button
                type="button"
                className="btn run-detail-primary-action institution-panel-action !min-h-9 !py-1 text-xs px-3 font-semibold flex items-center gap-1.5"
                onClick={() => setShowWizard(true)}
              >
                <UsersRound size={15} />
                Manage Roles
              </button>
            )}
          </div>

          <div className="institution-member-list">
            {(['ADMIN', 'HR', 'FINANCE', 'PAUSER', 'RELAYER'] as const).map((role) => (
              <RoleMembersList key={role} vault={vault} role={role} isAdmin={isAdmin} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
