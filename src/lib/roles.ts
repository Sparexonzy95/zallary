import { keccak256, toBytes, zeroHash } from 'viem'

export const ROLE = {
  ADMIN: zeroHash,
  HR: keccak256(toBytes('HR_ROLE')),
  FINANCE: keccak256(toBytes('FINANCE_ROLE')),
  RELAYER: keccak256(toBytes('RELAYER_ROLE')),
  PAUSER: keccak256(toBytes('PAUSER_ROLE')),
} as const

/** Every role the vault knows about. */
export type MemberRoleKey = keyof typeof ROLE
/** Roles that decide what a wallet can open in the app. */
export type RoleKey = Exclude<MemberRoleKey, 'PAUSER'>

export const ROLE_LABEL: Record<MemberRoleKey, string> = {
  ADMIN: 'Admin',
  HR: 'HR',
  FINANCE: 'Finance',
  RELAYER: 'Relayer',
  PAUSER: 'Pauser',
}

export const ROLE_HELP: Record<MemberRoleKey, string> = {
  ADMIN: 'Manages roles and the protocol fee.',
  HR: 'Prepares payroll drafts. Cannot move money.',
  FINANCE: 'Reviews and funds payroll, and reclaims expired pay.',
  RELAYER: 'Optional. Can submit claims for employees; pay always goes to the employee.',
  PAUSER: 'Can pause and resume the whole company in an emergency.',
}

export type PayrollStatus = 'Draft' | 'Funded' | 'Completed' | 'Refunded' | 'Cancelled'
export const STATUS_NAMES: readonly PayrollStatus[] = ['Draft', 'Funded', 'Completed', 'Refunded', 'Cancelled']
