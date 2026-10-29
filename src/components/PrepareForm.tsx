import { useMemo, useState } from 'react'
import {
  ClipboardPaste,
  FileText,
  Plus,
  Send,
  Trash2,
  Users,
  Zap,
} from 'lucide-react'
import { useAccount, useReadContracts } from 'wagmi'
import { erc20Abi, type Address } from 'viem'
import { vaultAbi } from '@/abi/vaultAbi'
import {
  MAX_EMPLOYEES,
  newPayrollId,
  parsePayroll,
  validateRows,
  type EmployeeRow,
} from '@/lib/payrollInput'
import { CHAIN_ID, USDC_ADDRESS } from '@/lib/chain'
import { usdc } from '@/lib/format'
import { formatUsdc } from '@/onchain-money'
import { useNowSeconds, usePayrollLabels, useSeparateApprover } from '@/hooks/data'
import { useTx } from '@/hooks/useTx'
import { useAddFunds } from '@/lib/addFunds'
import { Button, Card, Label, Notice } from '@/components/ui'

const toLocalInput = (date: Date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)

const blankRow = (): EmployeeRow => ({
  key: crypto.randomUUID(),
  address: '',
  amount: '',
})

export function PrepareForm({
  vault,
  isFinance,
  mode = 'draft',
}: {
  vault: Address
  isFinance: boolean
  mode?: 'draft' | 'direct'
}) {
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
  const [deadline, setDeadline] = useState(() =>
    toLocalInput(new Date(Date.now() + 30 * 86_400_000)),
  )

  const validated = useMemo(() => validateRows(rows), [rows])
  const pasteErrors = useMemo(
    () => (pasteText.trim() ? parsePayroll(pasteText).errors : []),
    [pasteText],
  )
  const deadlineSeconds = Math.floor(new Date(deadline).getTime() / 1000)
  const deadlineOk = Number.isFinite(deadlineSeconds) && deadlineSeconds > now + 60
  const hasErrors = Object.keys(validated.rowErrors).length > 0
  const canSubmit =
    validated.lines.length > 0 && !hasErrors && !validated.incomplete && deadlineOk

  // Dual-role shortcut: only for an account holding both HR and Finance when separate approver isn't enforced
  const quote = useReadContracts({
    allowFailure: false,
    query: {
      enabled:
        isFinance &&
        !separate.enforced &&
        Boolean(address) &&
        validated.total > 0n,
      refetchInterval: 10_000,
    },
    contracts: [
      {
        address: vault,
        abi: vaultAbi,
        functionName: 'calculateFee',
        args: [validated.total],
        chainId: CHAIN_ID,
      },
      {
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address ?? vault],
        chainId: CHAIN_ID,
      },
      {
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address ?? vault, vault],
        chainId: CHAIN_ID,
      },
    ],
  })

  const charge = quote.data?.[0][1]
  const balance = quote.data?.[1]
  const allowance = quote.data?.[2]
  const quoteReady = charge !== undefined && balance !== undefined && allowance !== undefined
  const enoughBalance = quoteReady && balance >= charge
  const needsApproval = quoteReady && allowance < charge

  const update = (key: string, patch: Partial<EmployeeRow>) =>
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    )

  const remove = (key: string) => {
    const fresh = blankRow()
    setRows((current) =>
      current.length > 1 ? current.filter((row) => row.key !== key) : [fresh],
    )
  }

  const add = () => {
    const fresh = blankRow()
    setRows((current) =>
      current.length < MAX_EMPLOYEES ? [...current, fresh] : current,
    )
  }

  const applyPaste = () => {
    const parsed = parsePayroll(pasteText)
    if (parsed.errors.length > 0 || parsed.lines.length === 0) return
    const converted = parsed.lines.map((line) => ({
      key: crypto.randomUUID(),
      address: line.address,
      amount: formatUsdc(line.amount),
    }))
    setRows((current) => {
      const kept = current.filter(
        (row) => row.address.trim() || row.amount.trim(),
      )
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
          args: [
            id,
            BigInt(deadlineSeconds),
            validated.lines.map((l) => l.address),
            validated.lines.map((l) => l.amount),
            validated.total,
          ],
        }),
      {
        success: 'Payroll draft created. Finance can now review and fund it.',
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
          args: [
            id,
            BigInt(deadlineSeconds),
            validated.lines.map((l) => l.address),
            validated.lines.map((l) => l.amount),
            validated.total,
          ],
        }),
      {
        success: 'Payroll atomically created and funded! Claiming is open.',
        onDone: () => {
          if (name.trim()) setLabel(id, name.trim())
          setRows([blankRow()])
          setName('')
        },
      },
    )
  }

  return (
    <Card className="space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          {mode === 'direct' ? (
            <Zap className="size-5 text-[var(--accent)]" />
          ) : (
            <FileText className="size-5 text-[var(--accent)]" />
          )}
          <div>
            <h3 className="display text-lg font-bold">
              {mode === 'direct' ? 'Create & Fund Payroll (One-Step)' : 'Draft New Payroll Batch'}
            </h3>
            <p className="text-xs text-[var(--muted)]">
              {mode === 'direct'
                ? 'Dual-role path: prepares and deposits USDC into escrow in one transaction.'
                : 'Maker-checker path: saves an immutable on-chain draft. No funds move until Finance audits.'}
            </p>
          </div>
        </div>
      </div>

      {mode === 'direct' && separate.enforced && (
        <Notice tone="warn">
          This company enforces maker-checker separation. One-step execution is disabled; drafts must be funded by a distinct Finance account.
        </Notice>
      )}

      {/* ─── Batch Metadata ─── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label hint="Local device tag">Payroll Batch Name</Label>
          <input
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. October 2026 Core Contributors"
          />
        </div>
        <div>
          <Label hint="Expiry timestamp for reclaims">Claim Expiration Deadline</Label>
          <input
            className="field tabular-nums"
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>
      </div>

      {!deadlineOk && (
        <Notice tone="bad">The claim deadline must be at least 1 minute in the future.</Notice>
      )}

      {/* ─── Employee Roster Section ─── */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-[var(--subtle)]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Recipients & Allocations ({validated.lines.length}/{MAX_EMPLOYEES})
            </span>
          </div>

          <button
            type="button"
            onClick={() => setPasteOpen((v) => !v)}
            className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
          >
            <ClipboardPaste className="size-3.5" />
            {pasteOpen ? 'Close Paste Area' : 'Bulk Paste List'}
          </button>
        </div>

        {/* Bulk Paste Box */}
        {pasteOpen && (
          <div className="inner rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--ink-2)]">Paste Tab/CSV Data</span>
              <span className="text-xs text-[var(--subtle)]">Format: address, amount</span>
            </div>
            <textarea
              className="field mono min-h-28 text-xs leading-relaxed"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5, 4500.00&#10;0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC, 3200.50"
              spellCheck={false}
            />
            {pasteErrors.length > 0 && (
              <p className="text-xs text-[var(--danger)]">{pasteErrors[0]}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                className="!min-h-10 text-xs"
                disabled={!pasteText.trim() || pasteErrors.length > 0}
                onClick={applyPaste}
              >
                Import Rows
              </Button>
            </div>
          </div>
        )}

        {/* Row Inputs */}
        <ul className="space-y-2.5">
          {rows.map((row, index) => {
            const error = validated.rowErrors[row.key]
            return (
              <li key={row.key} className="space-y-1">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <input
                      className="field mono text-xs sm:text-sm"
                      aria-label={`Employee ${index + 1} wallet address`}
                      value={row.address}
                      onChange={(e) => update(row.key, { address: e.target.value.trim() })}
                      placeholder="0x… recipient address"
                      spellCheck={false}
                      aria-invalid={Boolean(error)}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative w-full sm:w-44">
                      <input
                        className="field pr-14 tabular-nums text-right"
                        aria-label={`Employee ${index + 1} amount in USDC`}
                        inputMode="decimal"
                        value={row.amount}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9.]/g, '')
                          if (/^\d*\.?\d*$/.test(value)) update(row.key, { amount: value })
                        }}
                        placeholder="0.00"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--subtle)]">
                        USDC
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => remove(row.key)}
                      aria-label={`Remove recipient ${index + 1}`}
                      className="flex size-11 shrink-0 items-center justify-center rounded-xl hover:bg-white/10 text-[var(--subtle)] hover:text-[var(--danger)] transition-colors"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-[var(--danger)] px-1">{error}</p>
                )}
              </li>
            )
          })}
        </ul>

        {validated.rowErrors.limit && (
          <p className="text-xs text-[var(--danger)]">{validated.rowErrors.limit}</p>
        )}

        <Button
          variant="ghost"
          className="mt-2 !min-h-10 text-xs"
          onClick={add}
          disabled={rows.length >= MAX_EMPLOYEES}
        >
          <Plus className="size-3.5" /> Add Recipient
        </Button>

        {validated.incomplete && (
          <p className="text-xs text-[var(--warn)]">
            Please complete both wallet address and USDC amount for each line, or delete unused rows.
          </p>
        )}
      </div>

      {/* ─── Running Totals Summary Bar ─── */}
      {validated.lines.length > 0 && (
        <div className="inner flex flex-wrap items-center justify-between rounded-2xl p-4 gap-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Audited Payroll Sum
            </span>
            <div className="text-xs text-[var(--subtle)]">
              {validated.lines.length} {validated.lines.length === 1 ? 'verified recipient' : 'verified recipients'}
            </div>
          </div>
          <div className="display text-2xl font-bold tabular-nums text-[var(--ink)]">
            {usdc(validated.total)}{' '}
            <span className="text-sm font-normal text-[var(--muted)]">USDC</span>
          </div>
        </div>
      )}

      {tx.error && (
        <Notice tone="bad">{tx.error}</Notice>
      )}

      {/* ─── Submit Actions ─── */}
      {mode === 'draft' && (
        <Button
          full
          disabled={!canSubmit}
          loading={tx.busy}
          onClick={submit}
        >
          <FileText className="size-4" />
          {tx.status === 'wallet'
            ? 'Confirm in Wallet…'
            : tx.status === 'confirming'
              ? 'Recording Draft On-Chain…'
              : 'Save Immutable Draft for Finance Audit'}
        </Button>
      )}

      {/* ─── Direct Execution Box ─── */}
      {(mode === 'direct' || isFinance) && isFinance && !separate.enforced && (
        <div className="inner rounded-2xl p-4 space-y-3 border border-[var(--border)]">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent)]">
            <Zap className="size-3.5" />
            <span>Dual-Role Execution shortcut active</span>
          </div>
          <p className="text-xs text-[var(--muted)] leading-relaxed">
            Your connected wallet holds both HR and Finance authorizations with maker-checker policy unconstrained. You may draft and fund in one combined workflow.
          </p>

          {quoteReady && canSubmit && (
            <div className="flex justify-between text-xs text-[var(--subtle)] pt-1">
              <span>Required: {usdc(charge)} USDC (incl. fee)</span>
              <span>Wallet: {usdc(balance)} USDC</span>
            </div>
          )}

          {quoteReady && canSubmit && !enoughBalance && (
            <Notice tone="warn">
              Wallet has insufficient USDC ({usdc(balance)} available, {usdc(charge)} required).{' '}
              <button onClick={addFunds.open} className="font-semibold underline">
                Add USDC
              </button>
            </Notice>
          )}

          {(approve.error || direct.error) && (
            <Notice tone="bad">{approve.error ?? direct.error}</Notice>
          )}

          {needsApproval && canSubmit ? (
            <Button
              full
              disabled={!enoughBalance}
              loading={approve.busy}
              onClick={() =>
                charge !== undefined &&
                void approve.run(
                  (write) =>
                    write({
                      address: USDC_ADDRESS,
                      abi: erc20Abi,
                      functionName: 'approve',
                      args: [vault, charge],
                    }),
                  { success: 'USDC allowance approved! Proceed to save & fund.' },
                )
              }
            >
              {approve.status === 'wallet'
                ? 'Confirm in Wallet…'
                : approve.status === 'confirming'
                  ? 'Confirming Approval…'
                  : 'Step 1 of 2: Authorize USDC Allowance'}
            </Button>
          ) : (
            <Button
              full
              disabled={!canSubmit || !quoteReady || !enoughBalance}
              loading={direct.busy}
              onClick={saveAndFund}
            >
              <Send className="size-4" />
              {direct.status === 'wallet'
                ? 'Confirm in Wallet…'
                : direct.status === 'confirming'
                  ? 'Funding Escrow On-Chain…'
                  : 'Step 2 of 2: Save & Fund Payroll Now'}
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}
