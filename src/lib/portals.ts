import { CircleDollarSign, Landmark, ListChecks, ShieldCheck, type LucideIcon } from 'lucide-react'
import type { RoleKey } from '@/lib/roles'

export type Portal = 'hr' | 'finance' | 'employee' | 'institution'

export interface PortalInfo {
  key: Portal
  label: string
  blurb: string
  icon: LucideIcon
  /** Role needed to open it. Undefined means every wallet can. */
  role?: RoleKey
}

export const PORTALS: readonly PortalInfo[] = [
  { key: 'hr', label: 'HR Payroll', blurb: 'Draft and manage employee payroll rosters', icon: ListChecks, role: 'HR' },
  { key: 'finance', label: 'Finance', blurb: 'Review, fund, and reclaim escrowed payroll', icon: Landmark, role: 'FINANCE' },
  { key: 'employee', label: 'Claim Salary', blurb: 'Inspect and claim your earned payouts', icon: CircleDollarSign },
  { key: 'institution', label: 'Governance', blurb: 'Manage role assignments and safety policies', icon: ShieldCheck, role: 'ADMIN' },
]

export const canOpen = (portal: PortalInfo, roles: Record<RoleKey, boolean>) => !portal.role || roles[portal.role]

export const isPortal = (value: string | null): value is Portal => PORTALS.some((portal) => portal.key === value)

export function defaultPortal(roles: Record<RoleKey, boolean>): Portal {
  if (roles.HR) return 'hr'
  if (roles.FINANCE) return 'finance'
  if (roles.ADMIN) return 'institution'
  return 'employee'
}
