import { Building2, CircleDollarSign, Landmark, ListChecks, type LucideIcon } from 'lucide-react'
import type { RoleKey } from '@/lib/roles'

export type Portal = 'institution' | 'hr' | 'finance' | 'employee'

export interface PortalInfo {
  key: Portal
  label: string
  blurb: string
  icon: LucideIcon
  /** Role needed to open it. Undefined means every wallet can. */
  role?: RoleKey
}

export const PORTALS: readonly PortalInfo[] = [
  { key: 'institution', label: 'Institution', blurb: 'Manage role assignments and safety policies', icon: Building2, role: 'ADMIN' },
  { key: 'hr', label: 'HR Payroll', blurb: 'Draft and manage employee payroll rosters', icon: ListChecks, role: 'HR' },
  { key: 'finance', label: 'Finance', blurb: 'Review, fund, and reclaim escrowed payroll', icon: Landmark, role: 'FINANCE' },
  { key: 'employee', label: 'Claim Salary', blurb: 'Inspect and claim your earned payouts', icon: CircleDollarSign },
]

export const canOpen = (portal: PortalInfo, roles: Record<RoleKey, boolean>) =>
  roles.ADMIN || !portal.role || Boolean(roles[portal.role])

export const isPortal = (value: string | null): value is Portal => PORTALS.some((portal) => portal.key === value)

export function defaultPortal(roles: Record<RoleKey, boolean>): Portal {
  if (roles.ADMIN) return 'institution'
  if (roles.HR) return 'hr'
  if (roles.FINANCE) return 'finance'
  return 'employee'
}
