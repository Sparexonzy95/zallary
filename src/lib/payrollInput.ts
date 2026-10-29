import { getAddress, isAddress, keccak256, toHex, type Address, type Hex } from 'viem'
import { parseUsdc } from '@/onchain-money'

export interface PayrollLine {
  address: Address
  amount: bigint
}

export interface ParsedPayroll {
  lines: PayrollLine[]
  errors: string[]
  total: bigint
}

export const MAX_EMPLOYEES = 200

/** Parses "address, amount" lines (comma, tab or spaces as separators). */
export function parsePayroll(text: string): ParsedPayroll {
  const lines: PayrollLine[] = []
  const errors: string[] = []
  const seen = new Set<string>()
  const rows = text.split('\n').map((row) => row.trim()).filter((row) => row.length > 0)
  rows.forEach((row, index) => {
    const label = `Line ${index + 1}`
    const parts = row.split(/[\s,;]+/).filter(Boolean)
    if (parts.length !== 2) {
      errors.push(`${label}: use "address, amount".`)
      return
    }
    const [rawAddress, rawAmount] = parts
    if (!isAddress(rawAddress)) {
      errors.push(`${label}: invalid wallet address.`)
      return
    }
    const address = getAddress(rawAddress)
    if (seen.has(address)) {
      errors.push(`${label}: this employee is already listed.`)
      return
    }
    let amount: bigint
    try {
      amount = parseUsdc(rawAmount)
    } catch {
      errors.push(`${label}: invalid amount (up to 6 decimals).`)
      return
    }
    if (amount <= 0n) {
      errors.push(`${label}: the amount must be greater than zero.`)
      return
    }
    seen.add(address)
    lines.push({ address, amount })
  })
  if (rows.length > MAX_EMPLOYEES) errors.push(`A payroll can include at most ${MAX_EMPLOYEES} employees.`)
  const total = lines.reduce((sum, line) => sum + line.amount, 0n)
  return { lines, errors, total }
}

/** Unique bytes32 payroll ID. The name only makes the ID unguessable; it is not stored onchain. */
export function newPayrollId(label: string): Hex {
  return keccak256(toHex(`${label}|${Date.now()}|${crypto.randomUUID()}`))
}

export interface EmployeeRow {
  key: string
  address: string
  amount: string
}

export interface ValidatedRows {
  lines: PayrollLine[]
  rowErrors: Record<string, string>
  total: bigint
  /** True when a row has only one of its two fields filled. */
  incomplete: boolean
}

/** Validates the employee rows one by one. Fully blank rows are ignored. */
export function validateRows(rows: readonly EmployeeRow[]): ValidatedRows {
  const lines: PayrollLine[] = []
  const rowErrors: Record<string, string> = {}
  const seen = new Set<string>()
  let incomplete = false
  for (const row of rows) {
    const rawAddress = row.address.trim()
    const rawAmount = row.amount.trim()
    if (!rawAddress && !rawAmount) continue
    if (!rawAddress || !rawAmount) {
      incomplete = true
      continue
    }
    if (!isAddress(rawAddress)) {
      rowErrors[row.key] = 'Not a valid wallet address.'
      continue
    }
    const address = getAddress(rawAddress)
    if (seen.has(address)) {
      rowErrors[row.key] = 'This employee is already listed.'
      continue
    }
    let amount: bigint
    try {
      amount = parseUsdc(rawAmount)
    } catch {
      rowErrors[row.key] = 'Invalid amount (up to 6 decimals).'
      continue
    }
    if (amount <= 0n) {
      rowErrors[row.key] = 'The amount must be greater than zero.'
      continue
    }
    seen.add(address)
    lines.push({ address, amount })
  }
  if (lines.length > MAX_EMPLOYEES) rowErrors.limit = `A payroll can include at most ${MAX_EMPLOYEES} employees.`
  const total = lines.reduce((sum, line) => sum + line.amount, 0n)
  return { lines, rowErrors, total, incomplete }
}
