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
import { AddressLink, Badge, Button, Card, Label, Notice, Skeleton } from '@/components/ui'

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
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 pb-1 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <span className="display text-base font-bold">{ROLE_LABEL[role]}</span>
          {members.data && (
            <Badge tone={role === 'ADMIN' ? 'info' : 'neutral'}>
              {members.data.length} {members.data.length === 1 ? 'member' : 'members'}
            </Badge>
          )}
        </div>
        <span className="text-xs text-[var(--subtle)]">{ROLE_HELP[role]}</span>
      </div>

      {members.isLoading && <Skeleton className="h-12 rounded-xl" />}

      {!members.isLoading && (members.data?.length ?? 0) === 0 && (
        <div className="inner rounded-xl px-4 py-3 text-xs text-[var(--muted)]">
          No addresses currently assigned to this role.
        </div>
      )}

      <ul className="space-y-2">
        {members.data?.map((member) => (
          <li
            key={member}
            className="inner flex items-center justify-between gap-3 rounded-xl px-4 py-2.5 transition-all hover:border-[var(--border-strong)]"
          >
            <AddressLink address={member} label={`${member.slice(0, 10)}…${member.slice(-8)}`} />
            {removable && (
              <Button
                variant="danger"
                className="!min-h-9 !px-3 text-xs"
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
    <Card className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-[var(--border)]">
        <UserPlus className="size-5 text-[var(--accent)]" />
        <div>
          <h3 className="display text-lg font-bold">Grant Role Authorization</h3>
          <p className="text-xs text-[var(--muted)]">
            Enforce segregation of duties by delegating HR and Finance to distinct multisig or EOA addresses.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Select Role to Grant</Label>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Role">
          {EDITABLE.map((key) => {
            const active = role === key
            return (
              <button
                key={key}
                role="radio"
                aria-checked={active}
                onClick={() => setRole(key)}
                className="min-h-11 rounded-xl px-4 text-xs font-semibold uppercase tracking-wider transition-all duration-200"
                style={
                  active
                    ? {
                        background: 'var(--accent)',
                        color: 'var(--on-accent)',
                        boxShadow: '0 2px 8px rgba(254, 158, 21, 0.25)',
                      }
                    : {
                        background: 'var(--inset)',
                        color: 'var(--muted)',
                        border: '1px solid var(--border)',
                      }
                }
              >
                {ROLE_LABEL[key]}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-1">
        <Label>Recipient Wallet Address</Label>
        <input
          className="field mono text-xs sm:text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value.trim())}
          placeholder="0x… account address"
          spellCheck={false}
        />
        {input.length > 0 && !valid && (
          <p className="text-xs text-[var(--danger)] px-1">
            Please enter a valid Ethereum-compatible address.
          </p>
        )}
      </div>

      {tx.error && <Notice tone="bad">{tx.error}</Notice>}

      <Button full disabled={!valid} loading={tx.busy} onClick={submit}>
        <UserCheck className="size-4" />
        {tx.status === 'wallet'
          ? 'Confirm in Wallet…'
          : tx.status === 'confirming'
            ? 'Granting Authorization…'
            : `Grant ${ROLE_LABEL[role]} Role`}
      </Button>
    </Card>
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
    <Card className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Percent className="size-5 text-[var(--accent)]" />
          <h3 className="display text-lg font-bold">Protocol Disbursement Fee</h3>
        </div>
        {typeof feeBps === 'bigint' && (
          <Badge tone="info">{bpsToPercent(feeBps)} on funding</Badge>
        )}
      </div>

      <p className="text-sm text-[var(--muted)] leading-relaxed">
        Calculated and added at funding execution. Deducted from the Finance wallet and forwarded directly to the configured recipient (capped at 5%).
      </p>

      {typeof feeRecipient === 'string' && (
        <div className="inner flex flex-wrap items-center justify-between gap-2 rounded-xl p-3 text-xs">
          <span className="text-[var(--subtle)]">Fee Beneficiary:</span>
          <AddressLink address={feeRecipient} />
        </div>
      )}

      {isAdmin && (
        <div className="space-y-3 pt-2">
          <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
            <div>
              <Label hint="Max 5.00%">Rate (%)</Label>
              <input
                className="field tabular-nums text-right"
                inputMode="decimal"
                value={percent}
                onChange={(e) => setPercent(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder="0.25"
              />
            </div>
            <div>
              <Label hint="Leave blank to retain">Beneficiary Address</Label>
              <input
                className="field mono text-xs sm:text-sm"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value.trim())}
                placeholder="Keep existing"
              />
            </div>
          </div>

          <Button variant="ghost" full disabled={!valid} loading={tx.busy} onClick={save}>
            Update Fee Policy
          </Button>
        </div>
      )}
    </Card>
  )
}

function SeparateApproverCard({ vault, isAdmin }: Props) {
  const tx = useTx()
  const separate = useSeparateApprover(vault)
  if (!separate.supported) return null
  const next = !separate.enforced

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-[var(--accent)]" />
          <h3 className="display text-lg font-bold">Maker-Checker Policy</h3>
        </div>
        <Badge tone={separate.enforced ? 'good' : 'warn'}>
          {separate.enforced ? 'Enforced' : 'Relaxed'}
        </Badge>
      </div>

      <p className="text-sm text-[var(--muted)] leading-relaxed">
        {separate.enforced
          ? 'Strict governance: The Finance wallet that funds a payroll cannot be the HR account that prepared it. Dual-role atomic funding is disabled.'
          : 'Relaxed governance: Any Finance authorization can fund any draft, including self-drafted rosters.'}
      </p>

      {isAdmin && (
        <>
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
          >
            {next
              ? 'Enable Strict Maker-Checker Separation'
              : 'Allow Single-Wallet Preparation & Funding'}
          </Button>
        </>
      )}
    </Card>
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
    <Card className="space-y-3 border-[var(--border)]">
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <PauseOctagon className="size-5 text-[var(--danger)]" />
          <h3 className="display text-lg font-bold">Emergency Circuit Breaker</h3>
        </div>
        <Badge tone={isPaused ? 'bad' : 'good'}>
          {isPaused ? 'Vault Paused' : 'Operational'}
        </Badge>
      </div>

      <p className="text-sm text-[var(--muted)] leading-relaxed">
        Pausing halts new payroll drafting, funding, employee claims, and refunds across the vault until resumed by an authorized Pauser.
      </p>

      {tx.error && <Notice tone="bad">{tx.error}</Notice>}

      {pauser.data === true ? (
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
      ) : (
        <p className="text-xs text-[var(--subtle)]">
          Only wallets granted the Pauser role can toggle the emergency circuit breaker.
        </p>
      )}
    </Card>
  )
}

/** Role assignment and member lists. */
export function RolesSection({ vault, isAdmin }: Props) {
  return (
    <div className="space-y-6">
      {isAdmin && <GrantRole vault={vault} />}
      <Card className="space-y-6">
        {(['ADMIN', 'HR', 'FINANCE', 'RELAYER', 'PAUSER'] as const).map((role) => (
          <MemberList key={role} vault={vault} role={role} isAdmin={isAdmin} />
        ))}
      </Card>
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
