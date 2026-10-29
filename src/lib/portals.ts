import { Landmark, ShieldCheck, UserRound, Users, type LucideIcon } from 'lucide-react'
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
  { key: 'hr', label: 'HR payroll', blurb: 'Prepare payroll drafts', icon: Users, role: 'HR' },
  { key: 'finance', label: 'Finance and treasury', blurb: 'Review, fund and refund payroll', icon: Landmark, role: 'FINANCE' },
  { key: 'employee', label: 'My pay', blurb: 'Claim your salary', icon: UserRound },
  { key: 'institution', label: 'Governance', blurb: 'Roles, fees and safety', icon: ShieldCheck, role: 'ADMIN' },
]

export const canOpen = (portal: PortalInfo, roles: Record<RoleKey, boolean>) => !portal.role || roles[portal.role]

export const isPortal = (value: string | null): value is Portal => PORTALS.some((portal) => portal.key === value)

export function defaultPortal(roles: Record<RoleKey, boolean>): Portal {
  if (roles.HR) return 'hr'
  if (roles.FINANCE) return 'finance'
  if (roles.ADMIN) return 'institution'
  return 'employee'
}
