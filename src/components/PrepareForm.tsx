import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  ClipboardPaste,
  FileText,
  Plus,
  Send,
  Trash2,
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
import { Button, Field, Notice } from '@/components/ui'

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
  onCancel,
  onSuccess,
}: {
  vault: Address
  isFinance: boolean
  mode?: 'draft' | 'direct'
  onCancel?: () => void
  onSuccess?: () => void
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
          onSuccess?.()
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
          onSuccess?.()
        },
      },
    )
  }

  return (
    <div className="stack create-payroll-page employer-dashboard-redesign space-y-4">
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="template-detail-back-link inline-flex items-center gap-1.5 text-xs font-semibold text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Payroll Batches</span>
        </button>
      )}

      <div className="create-payroll-form create-payroll-form-redesigned">
        <section className="employer-task-card create-payroll-card">
          <div className="create-payroll-card-body space-y-6 p-5 sm:p-7">
            {mode === 'direct' && (
              <div className="pb-3 border-b border-white/10">
                <span className="font-mono text-xs uppercase tracking-wider text-[#FE9E15] block">Dual-Role Execution</span>
                <h2 className="text-xl font-bold font-display text-white mt-0.5">Direct Creation & Immediate Funding</h2>
              </div>
            )}

            {mode === 'direct' && separate.enforced && (
              <Notice tone="warn">
                This company enforces maker-checker separation. One-step execution is disabled; drafts must be funded by a distinct Finance account.
              </Notice>
            )}

            {/* ─── Batch Metadata ─── */}
            <div className="create-payroll-basics-grid grid sm:grid-cols-2 gap-4">
              <Field label="Payroll Batch Name" help="Local device tag for tracking">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. October 2026 Core Contributors"
                />
              </Field>
              <Field label="Claim Expiration Deadline" help="Expiry timestamp for reclaims">
                <input
                  className="tabular-nums"
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </Field>
            </div>

            {!deadlineOk && (
              <Notice tone="bad">The claim deadline must be at least 1 minute in the future.</Notice>
            )}

            {/* ─── Employee Roster Section ─── */}
            <div className="space-y-4 pt-2">
              <div className="create-payroll-merged-section-head flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div>
                  <h3 className="text-base font-bold text-white font-display">Recipients & Allocations</h3>
                  <p className="text-xs text-white/50">
                    {validated.lines.length} verified {validated.lines.length === 1 ? 'recipient' : 'recipients'} •{' '}
                    <span className="text-[#FE9E15] font-semibold">{usdc(validated.total)} USDC</span> total per run
                  </p>
                </div>

                <div className="create-payroll-employee-actions flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPasteOpen((v) => !v)}
                    className="btn btn-secondary !min-h-10 text-xs font-semibold"
                  >
                    <ClipboardPaste size={14} />
                    <span>{pasteOpen ? 'Close Paste' : 'Bulk Paste / CSV'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={add}
                    disabled={rows.length >= MAX_EMPLOYEES}
                    className="btn btn-secondary !min-h-10 text-xs font-semibold"
                  >
                    <Plus size={14} />
                    <span>Add Recipient</span>
                  </button>
                </div>
              </div>

              {/* Bulk Paste Box */}
              {pasteOpen && (
                <div className="inner rounded-2xl p-4 space-y-3 bg-white/[0.02] border border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">Paste Tab/CSV Data</span>
                    <span className="text-xs text-white/40 font-mono">Format: address, amount</span>
                  </div>
                  <textarea
                    className="mono min-h-28 text-xs leading-relaxed"
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5, 4500.00&#10;0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC, 3200.50"
                    spellCheck={false}
                  />
                  {pasteErrors.length > 0 && (
                    <p className="text-xs text-red-400">{pasteErrors[0]}</p>
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
              <div className="stack create-payroll-employees space-y-3">
                {rows.map((row, index) => {
                  const error = validated.rowErrors[row.key]
                  return (
                    <div key={row.key} className="employee-row create-payroll-employee-row">
                      <div className="create-payroll-employee-row-head">
                        <div className="employee-row-num text-xs font-bold font-mono uppercase tracking-wider text-white/80">
                          Recipient {index + 1}
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(row.key)}
                          aria-label={`Remove recipient ${index + 1}`}
                          className="create-payroll-remove-employee btn text-xs text-white/40 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="grid sm:grid-cols-3 gap-3 pt-2">
                        <div className="sm:col-span-2">
                          <Field label="Recipient Wallet Address" error={error}>
                            <input
                              className="mono text-xs sm:text-sm"
                              aria-label={`Employee ${index + 1} wallet address`}
                              value={row.address}
                              onChange={(e) => update(row.key, { address: e.target.value.trim() })}
                              placeholder="0x… recipient address"
                              spellCheck={false}
                              aria-invalid={Boolean(error)}
                            />
                          </Field>
                        </div>
                        <div>
                          <Field label="Allocation">
                            <div className="relative">
                              <input
                                className="pr-14 tabular-nums text-right text-xs sm:text-sm"
                                aria-label={`Employee ${index + 1} amount in USDC`}
                                inputMode="decimal"
                                value={row.amount}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/[^0-9.]/g, '')
                                  if (/^\d*\.?\d*$/.test(value)) update(row.key, { amount: value })
                                }}
                                placeholder="0.00"
                              />
                              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-white/40 font-mono">
                                USDC
                              </span>
                            </div>
                          </Field>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {validated.rowErrors.limit && (
                <p className="text-xs text-red-400">{validated.rowErrors.limit}</p>
              )}

              {validated.incomplete && (
                <p className="text-xs text-amber-400">
                  Please complete both wallet address and USDC amount for each line, or delete unused rows.
                </p>
              )}
            </div>

            {/* ─── Running Totals Summary Bar ─── */}
            {validated.lines.length > 0 && (
              <div className="employer-task-hero-metrics grid sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="employer-task-hero-metric">
                  <span className="text-xs uppercase tracking-wider text-white/40 font-mono">Recipients</span>
                  <strong className="text-xl font-bold text-white font-mono">
                    {validated.lines.length} {validated.lines.length === 1 ? 'recipient' : 'recipients'}
                  </strong>
                </div>
                <div className="employer-task-hero-metric">
                  <span className="text-xs uppercase tracking-wider text-white/40 font-mono">Total Allocation</span>
                  <strong className="text-xl font-bold text-[#38d996] font-mono">
                    {usdc(validated.total)} <span className="text-xs text-white/50">USDC</span>
                  </strong>
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
                className="btn btn-primary min-h-12 text-sm font-semibold"
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
            {mode === 'direct' && isFinance && !separate.enforced && (
              <div className="inner rounded-2xl p-4 sm:p-5 space-y-4 border border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#FE9E15]">
                  <Zap className="size-4" />
                  <span>Dual-Role Execution shortcut active</span>
                </div>
                <p className="text-xs text-white/60 leading-relaxed">
                  Your connected wallet holds both HR and Finance authorizations with maker-checker policy unconstrained. You may draft and fund in one combined workflow.
                </p>

                {quoteReady && canSubmit && (
                  <div className="flex justify-between text-xs text-white/50 pt-1 font-mono">
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
                    className="btn btn-primary min-h-12 text-sm font-semibold"
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
                    className="btn btn-primary min-h-12 text-sm font-semibold"
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
          </div>
        </section>
      </div>
    </div>
  )
}
