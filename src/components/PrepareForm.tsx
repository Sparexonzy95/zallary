import { useMemo, useState } from 'react'
import { FileText, Plus, Trash2 } from 'lucide-react'
import { useAccount, useReadContracts } from 'wagmi'
import { erc20Abi, type Address } from 'viem'
import { vaultAbi } from '@/abi/vaultAbi'
import { MAX_EMPLOYEES, newPayrollId, parsePayroll, validateRows, type EmployeeRow } from '@/lib/payrollInput'
import { CHAIN_ID, USDC_ADDRESS } from '@/lib/chain'
import { usdc } from '@/lib/format'
import { formatUsdc } from '@/onchain-money'
import { useNowSeconds, usePayrollLabels, useSeparateApprover } from '@/hooks/data'
import { useTx } from '@/hooks/useTx'
import { useAddFunds } from '@/lib/addFunds'
import { Button, Card, Label, Notice } from '@/components/ui'

const toLocalInput = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)

const blankRow = (): EmployeeRow => ({ key: crypto.randomUUID(), address: '', amount: '' })

export function PrepareForm({ vault, isFinance, mode = 'draft' }: { vault: Address; isFinance: boolean; mode?: 'draft' | 'direct' }) {
  const { address } = useAccount()
  const tx = useTx()
  const approve = useTx()
  const addFunds = useAddFunds()
  const direct = useTx()
  const separate = useSeparateApprover(vault)
  const now = useNowSeconds()
  const { setLabel } = usePayrollLabels(vault)
  const [name, setName] = useState('')
  const [rows, setRows] = useState<EmployeeRow[]>(() => [blankRow()])
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [deadline, setDeadline] = useState(() => toLocalInput(new Date(Date.now() + 30 * 86_400_000)))

  const validated = useMemo(() => validateRows(rows), [rows])
  const pasteErrors = useMemo(() => (pasteText.trim() ? parsePayroll(pasteText).errors : []), [pasteText])
  const deadlineSeconds = Math.floor(new Date(deadline).getTime() / 1000)
  const deadlineOk = Number.isFinite(deadlineSeconds) && deadlineSeconds > now + 60
  const hasErrors = Object.keys(validated.rowErrors).length > 0
  const canSubmit = validated.lines.length > 0 && !hasErrors && !validated.incomplete && deadlineOk

  // Single-wallet shortcut: only for an account that holds both HR and Finance roles.
  const quote = useReadContracts({
    allowFailure: false,
    query: { enabled: isFinance && !separate.enforced && Boolean(address) && validated.total > 0n, refetchInterval: 10_000 },
    contracts: [
      { address: vault, abi: vaultAbi, functionName: 'calculateFee', args: [validated.total], chainId: CHAIN_ID },
      { address: USDC_ADDRESS, abi: erc20Abi, functionName: 'balanceOf', args: [address ?? vault], chainId: CHAIN_ID },
      { address: USDC_ADDRESS, abi: erc20Abi, functionName: 'allowance', args: [address ?? vault, vault], chainId: CHAIN_ID },
    ],
  })
  const charge = quote.data?.[0][1]
  const balance = quote.data?.[1]
  const allowance = quote.data?.[2]
  const quoteReady = charge !== undefined && balance !== undefined && allowance !== undefined
  const enoughBalance = quoteReady && balance >= charge
  const needsApproval = quoteReady && allowance < charge

  const update = (key: string, patch: Partial<EmployeeRow>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  const remove = (key: string) => {
    const fresh = blankRow()
    setRows((current) => (current.length > 1 ? current.filter((row) => row.key !== key) : [fresh]))
  }
  const add = () => {
    const fresh = blankRow()
    setRows((current) => (current.length < MAX_EMPLOYEES ? [...current, fresh] : current))
  }

  const applyPaste = () => {
    const parsed = parsePayroll(pasteText)
    if (parsed.errors.length > 0 || parsed.lines.length === 0) return
    const converted = parsed.lines.map((line) => ({ key: blankRow().key, address: line.address, amount: formatUsdc(line.amount) }))
    setRows((current) => {
      const kept = current.filter((row) => row.address.trim() || row.amount.trim())
      return [...kept, ...converted]
    })
    setPasteText('')
    setPasteOpen(false)
  }

  const submit = () => {
    if (!canSubmit) return
    const id = newPayrollId(name)
    void tx.run(
      (write) =>
        write({
          address: vault,
          abi: vaultAbi,
          functionName: 'createPayrollDraft',
          args: [id, BigInt(deadlineSeconds), validated.lines.map((l) => l.address), validated.lines.map((l) => l.amount), validated.total],
        }),
      {
        success: 'Draft saved. Finance can now review and fund it.',
        onDone: () => {
          if (name.trim()) setLabel(id, name.trim())
          setRows([blankRow()])
          setName('')
        },
      },
    )
  }

  const saveAndFund = () => {
    if (!canSubmit) return
    const id = newPayrollId(name)
    void direct.run(
      (write) =>
        write({
          address: vault,
          abi: vaultAbi,
          functionName: 'fundPayrollDirect',
          args: [id, BigInt(deadlineSeconds), validated.lines.map((l) => l.address), validated.lines.map((l) => l.amount), validated.total],
        }),
      {
        success: 'Payroll saved and funded. Employees can claim now.',
        onDone: () => {
          if (name.trim()) setLabel(id, name.trim())
          setRows([blankRow()])
          setName('')
        },
      },
    )
  }

  return (
    <Card>
      <h3 className="display text-lg font-semibold">{mode === 'direct' ? 'Create and fund in one step' : 'Prepare a payroll'}</h3>
      <p className="mt-1 text-sm text-pretty" style={{ color: 'var(--muted)' }}>
        {mode === 'direct'
          ? 'For a wallet that holds both HR and Finance roles. Enter the payroll and pay it in a single step.'
          : 'This saves a draft only. No money moves until a Finance account reviews and funds it.'}
      </p>
      {mode === 'direct' && separate.enforced && (
        <div className="mt-3">
          <Notice tone="warn">This company requires a different person to fund each payroll, so the one-step shortcut is switched off.</Notice>
        </div>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <Label hint="shown on this device">Name</Label>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="November salaries" />
        </div>
        <div>
          <Label hint="unclaimed pay can be returned after">Claim deadline</Label>
          <input className="field" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>
      </div>
      {!deadlineOk && (
        <p className="mt-2 text-xs" style={{ color: 'var(--danger)' }}>
          Pick a deadline in the future.
        </p>
      )}

      <div className="mt-5">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--muted)' }}>
            Employees
          </span>
          <button onClick={() => setPasteOpen((v) => !v)} className="min-h-11 text-xs font-semibold" style={{ color: 'var(--accent-hover)' }}>
            {pasteOpen ? 'Close paste' : 'Paste a list'}
          </button>
        </div>

        {pasteOpen && (
          <div className="inner mb-3 rounded-2xl p-3">
            <textarea
              className="field mono min-h-28 text-xs"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={'0xAbc…, 3200.00\n0xDef…, 2750.50'}
              spellCheck={false}
            />
            <p className="mt-1.5 text-xs" style={{ color: 'var(--subtle)' }}>
              One employee per line: wallet address, then amount. They are added to the fields below.
            </p>
            {pasteErrors.length > 0 && <p className="mt-1.5 text-xs" style={{ color: 'var(--danger)' }}>{pasteErrors[0]}</p>}
            <Button variant="ghost" className="mt-2" disabled={!pasteText.trim() || pasteErrors.length > 0} onClick={applyPaste}>
              Add to list
            </Button>
          </div>
        )}

        <ul className="space-y-3">
          {rows.map((row, index) => {
            const error = validated.rowErrors[row.key]
            return (
              <li key={row.key}>
                <div className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_150px_auto]">
                  <input
                    className="field mono col-span-2 text-xs sm:col-span-1"
                    aria-label={`Employee ${index + 1} wallet address`}
                    value={row.address}
                    onChange={(e) => update(row.key, { address: e.target.value.trim() })}
                    placeholder="Wallet address 0x…"
                    spellCheck={false}
                    aria-invalid={Boolean(error)}
                  />
                  <div className="relative">
                    <input
                      className="field pr-14 tabular-nums"
                      aria-label={`Employee ${index + 1} amount in USDC`}
                      inputMode="decimal"
                      value={row.amount}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.]/g, '')
                        if (/^\d*\.?\d*$/.test(value)) update(row.key, { amount: value })
                      }}
                      placeholder="0.00"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold" style={{ color: 'var(--subtle)' }}>
                      USDC
                    </span>
                  </div>
                  <button
                    onClick={() => remove(row.key)}
                    aria-label={`Remove employee ${index + 1}`}
                    className="flex size-11 items-center justify-center rounded-2xl hover:bg-white/10"
                  >
                    <Trash2 className="size-4" style={{ color: 'var(--subtle)' }} />
                  </button>
                </div>
                {error && (
                  <p className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>
                    {error}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
        {validated.rowErrors.limit && <p className="mt-2 text-xs" style={{ color: 'var(--danger)' }}>{validated.rowErrors.limit}</p>}
        <Button variant="ghost" className="mt-3" onClick={add} disabled={rows.length >= MAX_EMPLOYEES}>
          <Plus className="size-4" /> Add employee
        </Button>
        {validated.incomplete && (
          <p className="mt-2 text-xs" style={{ color: 'var(--warn)' }}>
            Fill in both the wallet address and the amount for each employee, or remove the empty row.
          </p>
        )}
      </div>

      {validated.lines.length > 0 && (
        <div className="inner mt-4 flex items-baseline justify-between rounded-2xl p-4">
          <span className="text-sm" style={{ color: 'var(--muted)' }}>
            {validated.lines.length} {validated.lines.length === 1 ? 'employee' : 'employees'}
          </span>
          <span className="display text-2xl font-bold tabular-nums">
            {usdc(validated.total)} <span className="text-sm font-medium" style={{ color: 'var(--subtle)' }}>USDC</span>
          </span>
        </div>
      )}
      {tx.error && (
        <div className="mt-3">
          <Notice tone="bad">{tx.error}</Notice>
        </div>
      )}
      {mode === 'draft' && (
        <Button full className="mt-4" variant={isFinance && !separate.enforced ? 'ghost' : 'primary'} disabled={!canSubmit} loading={tx.busy} onClick={submit}>
          <FileText className="size-4" />
          {tx.status === 'wallet' ? 'Confirm in wallet' : tx.status === 'confirming' ? 'Saving draft' : 'Save draft'}
        </Button>
      )}

      {(mode === 'direct' || isFinance) && isFinance && !separate.enforced && (
        <div className="inner mt-3 space-y-3 rounded-2xl p-4">
          <p className="text-sm text-pretty" style={{ color: 'var(--ink-2)' }}>
            This wallet holds both HR and Finance, so it can save and fund in one step. Use separate wallets for HR and Finance in a real company, so a second person reviews every payroll.
          </p>
          {quoteReady && canSubmit && (
            <p className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
              You pay {usdc(charge)} USDC including the fee. Your balance: {usdc(balance)} USDC.
            </p>
          )}
          {quoteReady && canSubmit && !enoughBalance && (
            <Notice tone="warn">
              Your wallet needs {usdc(charge - balance)} more USDC.{' '}
              <button onClick={addFunds.open} className="font-semibold underline">
                Add USDC
              </button>
            </Notice>
          )}
          {(approve.error || direct.error) && <Notice tone="bad">{approve.error ?? direct.error}</Notice>}
          {needsApproval && canSubmit ? (
            <Button
              full
              disabled={!enoughBalance}
              loading={approve.busy}
              onClick={() =>
                charge !== undefined &&
                void approve.run((write) => write({ address: USDC_ADDRESS, abi: erc20Abi, functionName: 'approve', args: [vault, charge] }), {
                  success: 'Approved. You can save and fund now.',
                })
              }
            >
              {approve.status === 'wallet' ? 'Confirm in wallet' : approve.status === 'confirming' ? 'Approving' : 'Step 1 of 2: approve USDC'}
            </Button>
          ) : (
            <Button full disabled={!canSubmit || !quoteReady || !enoughBalance} loading={direct.busy} onClick={saveAndFund}>
              {direct.status === 'wallet' ? 'Confirm in wallet' : direct.status === 'confirming' ? 'Funding' : 'Save and fund now'}
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}
