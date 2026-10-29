import { useState } from 'react'
import { UserMinus, UserPlus } from 'lucide-react'
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

function MemberList({ vault, role, isAdmin }: { vault: Address; role: MemberRoleKey; isAdmin: boolean }) {
  const members = useRoleMembers(vault, ROLE[role])
  const tx = useTx()
  const removable = isAdmin && EDITABLE.includes(role)
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 className="display text-base font-semibold">
          {ROLE_LABEL[role]}
          {members.data ? <span className="ml-2 text-xs font-medium" style={{ color: 'var(--subtle)' }}>{members.data.length}</span> : null}
        </h3>
        <span className="text-xs text-pretty" style={{ color: 'var(--subtle)' }}>
          {ROLE_HELP[role]}
        </span>
      </div>
      {members.isLoading && <Skeleton className="h-11" />}
      {!members.isLoading && (members.data?.length ?? 0) === 0 && (
        <div className="inner rounded-2xl px-4 py-3 text-sm" style={{ color: 'var(--muted)' }}>
          No one has this role yet.
        </div>
      )}
      <ul className="space-y-2">
        {members.data?.map((member) => (
          <li key={member} className="inner flex min-h-11 items-center justify-between gap-3 rounded-2xl px-4 py-2">
            <AddressLink address={member} label={`${member.slice(0, 10)}…${member.slice(-8)}`} />
            {removable && (
              <Button
                variant="danger"
                className="!min-h-9 !px-3"
                loading={tx.busy}
                onClick={() =>
                  void tx.run(
                    (write) => write({ address: vault, abi: vaultAbi, functionName: 'revokeRole', args: [ROLE[role], member] }),
                    { success: `${ROLE_LABEL[role]} role removed.` },
                  )
                }
              >
                <UserMinus className="size-4" /> Remove
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
    void tx.run((write) => write({ address: vault, abi: vaultAbi, functionName: 'grantRole', args: [ROLE[role], input] }), {
      success: `${ROLE_LABEL[role]} role granted.`,
      onDone: () => setInput(''),
    })
  }
  return (
    <Card>
      <h3 className="display text-lg font-semibold">Assign a role</h3>
      <p className="mt-1 text-sm text-pretty" style={{ color: 'var(--muted)' }}>
        Use a different wallet for HR and for Finance, so nobody approves their own payroll.
      </p>
      <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Role">
        {EDITABLE.map((key) => (
          <button
            key={key}
            role="radio"
            aria-checked={role === key}
            onClick={() => setRole(key)}
            className="min-h-11 rounded-2xl px-4 text-sm font-semibold transition-colors"
            style={
              role === key
                ? { background: 'var(--accent)', color: 'var(--on-accent)' }
                : { background: 'var(--surface-strong)', border: '1px solid var(--border)' }
            }
          >
            {ROLE_LABEL[key]}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <Label>Wallet address</Label>
        <input className="field mono" value={input} onChange={(e) => setInput(e.target.value.trim())} placeholder="0x…" />
        {input.length > 0 && !valid && (
          <p className="mt-1.5 text-xs" style={{ color: 'var(--danger)' }}>
            That is not a valid address.
          </p>
        )}
      </div>
      {tx.error && (
        <div className="mt-3">
          <Notice tone="bad">{tx.error}</Notice>
        </div>
      )}
      <Button full className="mt-4" disabled={!valid} loading={tx.busy} onClick={submit}>
        <UserPlus className="size-4" />
        {tx.status === 'wallet' ? 'Confirm in wallet' : tx.status === 'confirming' ? 'Granting role' : `Grant ${ROLE_LABEL[role]} role`}
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
  const valid = percent !== '' && bps >= 0 && bps <= 500 && typeof target === 'string' && isAddress(target)
  const save = () => {
    if (!valid || typeof target !== 'string' || !isAddress(target)) return
    void tx.run(
      (write) => write({ address: vault, abi: vaultAbi, functionName: 'setProtocolFee', args: [BigInt(bps), target] }),
      { success: 'Fee updated. It applies to payrolls funded from now on.', onDone: () => setPercent('') },
    )
  }
  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <h3 className="display text-lg font-semibold">Fee</h3>
        {typeof feeBps === 'bigint' && <Badge tone="info">{bpsToPercent(feeBps)} of each payroll</Badge>}
      </div>
      <p className="mt-1 text-sm text-pretty" style={{ color: 'var(--muted)' }}>
        Charged on top of the payroll when Finance funds it, and sent to the fee recipient. Maximum 5%.
      </p>
      {typeof feeRecipient === 'string' && (
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span style={{ color: 'var(--muted)' }}>Recipient</span>
          <AddressLink address={feeRecipient} />
        </div>
      )}
      {isAdmin && (
        <div className="mt-4 grid gap-3 sm:grid-cols-[120px_1fr]">
          <div>
            <Label>New fee %</Label>
            <input className="field tabular-nums" inputMode="decimal" value={percent} onChange={(e) => setPercent(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0.25" />
          </div>
          <div>
            <Label>Recipient (optional)</Label>
            <input className="field mono" value={recipient} onChange={(e) => setRecipient(e.target.value.trim())} placeholder="Keep current" />
          </div>
          <div className="sm:col-span-2">
            <Button variant="ghost" full disabled={!valid} loading={tx.busy} onClick={save}>
              Update fee
            </Button>
          </div>
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
    <Card>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="display text-lg font-semibold">Payroll approval</h3>
        <Badge tone={separate.enforced ? 'good' : 'neutral'}>{separate.enforced ? 'Two people required' : 'One wallet allowed'}</Badge>
      </div>
      <p className="mt-1 text-sm text-pretty" style={{ color: 'var(--muted)' }}>
        {separate.enforced
          ? 'A Finance wallet cannot fund a payroll that it prepared as HR. A different person must approve.'
          : 'Any wallet with the Finance role can fund a payroll, even if it also prepared it as HR or is the admin.'}
      </p>
      {isAdmin && (
        <>
          {tx.error && (
            <div className="mt-3">
              <Notice tone="bad">{tx.error}</Notice>
            </div>
          )}
          <Button
            variant="ghost"
            full
            className="mt-4"
            loading={tx.busy}
            onClick={() =>
              void tx.run((write) => write({ address: vault, abi: vaultAbi, functionName: 'setRequireSeparateApprover', args: [next] }), {
                success: next ? 'A different Finance wallet is now required.' : 'One wallet can now prepare and fund.',
              })
            }
          >
            {next ? 'Require a different approver' : 'Allow one wallet to prepare and fund'}
          </Button>
        </>
      )}
    </Card>
  )
}

function PauseCard({ vault }: { vault: Address }) {
  const { address } = useAccount()
  const tx = useTx()
  const paused = useReadContract({ address: vault, abi: vaultAbi, functionName: 'paused', chainId: CHAIN_ID, query: { refetchInterval: 10_000 } })
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
    <Card>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="display text-lg font-semibold">Emergency pause</h3>
        <Badge tone={isPaused ? 'bad' : 'good'}>{isPaused ? 'Paused' : 'Running'}</Badge>
      </div>
      <p className="mt-1 text-sm text-pretty" style={{ color: 'var(--muted)' }}>
        Pausing stops new payrolls, funding, claims and refunds for this company until it is resumed.
      </p>
      {tx.error && (
        <div className="mt-3">
          <Notice tone="bad">{tx.error}</Notice>
        </div>
      )}
      {pauser.data === true ? (
        <Button
          variant={isPaused ? 'primary' : 'danger'}
          full
          className="mt-4"
          loading={tx.busy}
          onClick={() =>
            void tx.run((write) => write({ address: vault, abi: vaultAbi, functionName: isPaused ? 'unpause' : 'pause' }), {
              success: isPaused ? 'Company resumed.' : 'Company paused.',
            })
          }
        >
          {isPaused ? 'Resume company' : 'Pause company'}
        </Button>
      ) : (
        <p className="mt-3 text-xs" style={{ color: 'var(--subtle)' }}>
          Only a wallet with the Pauser role can pause or resume. Assign it in Roles.
        </p>
      )}
    </Card>
  )
}

/** Role assignment and member lists. */
export function RolesSection({ vault, isAdmin }: Props) {
  return (
    <div className="space-y-5">
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
    <div className="space-y-5">
      <SeparateApproverCard vault={vault} isAdmin={isAdmin} />
      <FeeCard vault={vault} isAdmin={isAdmin} />
      <PauseCard vault={vault} />
    </div>
  )
}
