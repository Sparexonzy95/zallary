import { useState, useSyncExternalStore } from 'react'
import { useQuery } from '@tanstack/react-query'
import { usePublicClient, useReadContract, useReadContracts } from 'wagmi'
import type { Address, Hex, ReadContractReturnType } from 'viem'
import { vaultAbi } from '@/abi/vaultAbi'
import { factoryAbi } from '@/abi/factoryAbi'
import { FACTORY_ADDRESS } from '@/lib/deployments'
import { CHAIN_ID } from '@/lib/chain'
import { ROLE, type RoleKey } from '@/lib/roles'

export type Payroll = ReadContractReturnType<typeof vaultAbi, 'getPayroll'>
export interface PayrollRow {
  id: Hex
  meta: Payroll
}

export interface CompanyRow {
  id: number
  vault: Address
  creator: Address
  name: string
  createdAt: bigint
  roles: Record<RoleKey, boolean>
  claimable: bigint
}

const NO_ROLES: Record<RoleKey, boolean> = { ADMIN: false, HR: false, FINANCE: false, RELAYER: false }
const PAGE = 100n
const MAX_COMPANIES = 500n

/** Every company in the factory, with the connected wallet's roles and claimable pay in each. */
export function useCompanies(account: Address | undefined) {
  const client = usePublicClient({ chainId: CHAIN_ID })
  return useQuery({
    queryKey: ['companies', FACTORY_ADDRESS, account],
    enabled: Boolean(FACTORY_ADDRESS && client),
    refetchInterval: 15_000,
    queryFn: async (): Promise<CompanyRow[]> => {
      if (!client || !FACTORY_ADDRESS) return []
      const count = await client.readContract({ address: FACTORY_ADDRESS, abi: factoryAbi, functionName: 'companyCount' })
      const total = count > MAX_COMPANIES ? MAX_COMPANIES : count
      const companies = []
      for (let offset = 0n; offset < total; offset += PAGE) {
        const page = await client.readContract({
          address: FACTORY_ADDRESS,
          abi: factoryAbi,
          functionName: 'getCompanies',
          args: [offset, PAGE],
        })
        companies.push(...page)
      }
      if (companies.length === 0) return []
      const who = account
      const results = who
        ? await client.multicall({
            allowFailure: false,
            contracts: companies.flatMap((company) => [
              { address: company.vault, abi: vaultAbi, functionName: 'hasRole', args: [ROLE.ADMIN, who] },
              { address: company.vault, abi: vaultAbi, functionName: 'hasRole', args: [ROLE.HR, who] },
              { address: company.vault, abi: vaultAbi, functionName: 'hasRole', args: [ROLE.FINANCE, who] },
              { address: company.vault, abi: vaultAbi, functionName: 'hasRole', args: [ROLE.RELAYER, who] },
              { address: company.vault, abi: vaultAbi, functionName: 'getClaimableBalance', args: [who] },
            ] as const),
          })
        : []
      return companies.map((company, index) => {
        const base = index * 5
        return {
          id: index,
          vault: company.vault,
          creator: company.creator,
          name: company.name,
          createdAt: company.createdAt,
          roles: who
            ? {
                ADMIN: Boolean(results[base]),
                HR: Boolean(results[base + 1]),
                FINANCE: Boolean(results[base + 2]),
                RELAYER: Boolean(results[base + 3]),
              }
            : NO_ROLES,
          claimable: who ? BigInt(results[base + 4]) : 0n,
        }
      })
    },
  })
}

/** The connected wallet's roles inside one company vault. */
export function useRoles(vault: Address | undefined, account: Address | undefined) {
  const enabled = Boolean(vault && account)
  const query = useReadContracts({
    allowFailure: false,
    query: { enabled, refetchInterval: 15_000 },
    contracts: (['ADMIN', 'HR', 'FINANCE', 'RELAYER'] as const).map((key) => ({
      address: vault,
      abi: vaultAbi,
      functionName: 'hasRole' as const,
      args: [ROLE[key], account] as const,
      chainId: CHAIN_ID,
    })),
  })
  const data = query.data
  const roles: Record<RoleKey, boolean> = data
    ? { ADMIN: Boolean(data[0]), HR: Boolean(data[1]), FINANCE: Boolean(data[2]), RELAYER: Boolean(data[3]) }
    : NO_ROLES
  return { roles, isLoading: enabled && query.isLoading }
}

/** All payrolls of a company, newest first. */
export function usePayrolls(vault: Address | undefined) {
  const client = usePublicClient({ chainId: CHAIN_ID })
  return useQuery({
    queryKey: ['payrolls', vault],
    enabled: Boolean(vault && client),
    refetchInterval: 15_000,
    queryFn: async (): Promise<PayrollRow[]> => {
      if (!client || !vault) return []
      const ids = await client.readContract({ address: vault, abi: vaultAbi, functionName: 'getPayrollIds', args: [0n, PAGE] })
      if (ids.length === 0) return []
      const metas = await client.multicall({
        allowFailure: false,
        contracts: ids.map((id) => ({ address: vault, abi: vaultAbi, functionName: 'getPayroll', args: [id] }) as const),
      })
      return ids.map((id, index) => ({ id, meta: metas[index] })).reverse()
    },
  })
}

/** Members of one role, read from the vault's onchain member list. */
export function useRoleMembers(vault: Address | undefined, role: Hex) {
  const client = usePublicClient({ chainId: CHAIN_ID })
  return useQuery({
    queryKey: ['members', vault, role],
    enabled: Boolean(vault && client),
    refetchInterval: 15_000,
    queryFn: async (): Promise<readonly Address[]> => {
      if (!client || !vault) return []
      return client.readContract({ address: vault, abi: vaultAbi, functionName: 'getRoleMembers', args: [role, 0n, PAGE] })
    },
  })
}

const readLabels = (storageKey: string): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(storageKey) ?? '{}') as Record<string, string>
  } catch {
    return {}
  }
}

/** Payroll names are not stored onchain. This keeps the names typed in this browser. */
export function usePayrollLabels(vault: Address | undefined) {
  const storageKey = `zalary:labels:${vault ?? 'none'}`
  const [labels, setLabels] = useState<Record<string, string>>(() => readLabels(storageKey))
  const setLabel = (id: string, label: string) => {
    const next = { ...readLabels(storageKey), [id]: label }
    setLabels(next)
    localStorage.setItem(storageKey, JSON.stringify(next))
  }
  return { labels, setLabel }
}

const subscribeClock = (notify: () => void) => {
  const timer = setInterval(notify, 15_000)
  return () => clearInterval(timer)
}
const clockSnapshot = () => Math.floor(Date.now() / 15_000) * 15
/** Current unix time in seconds, refreshed every 15 seconds. */
export function useNowSeconds(): number {
  return useSyncExternalStore(subscribeClock, clockSnapshot, () => 0)
}

/**
 * Whether Finance must be a different wallet than the HR account that prepared the payroll.
 * Vaults created before this setting existed always enforce it, so an unreadable flag counts as enforced.
 */
export function useSeparateApprover(vault: Address | undefined) {
  const read = useReadContract({
    address: vault,
    abi: vaultAbi,
    functionName: 'requireSeparateApprover',
    chainId: CHAIN_ID,
    query: { enabled: Boolean(vault), refetchInterval: 15_000, retry: false },
  })
  return {
    enforced: read.data ?? true,
    supported: read.data !== undefined,
    isLoading: read.isLoading,
  }
}
