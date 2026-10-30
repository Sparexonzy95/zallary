# Zalary Payroll

> Built with Arc Studio - money-powered apps in minutes

This is the **project memory** - what Arc Studio remembers about building this app. It helps future agents (or humans) understand and extend the project.

---

## What This App Does

Institutional USDC payroll on Arc Testnet. A wallet creates a company through `ZalaryCompanyFactory` (deploys that company's own `ZalaryPayrollVault`, creator = admin), the admin assigns HR / Finance / Relayer roles, HR prepares payroll drafts, a different Finance account reviews and funds them (fee on top, company-set, max 5%), employees claim. Each company sets its own fee.

Decisions: funding pulls from the Finance wallet; refunds return to that wallet; admin can rescue only USDC surplus above escrow. Refund UI and admin extras (pause, relayer flows) are not built yet.

Contract sources: `contracts/ZalaryPayrollVault.sol`, `contracts/ZalaryCompanyFactory.sol`; design notes in `contracts/ZalaryPayrollVault-design.md`. ABIs for the app are in `src/abi/` (regenerate from `contracts/out/` after contract changes). Factory address lives in `src/lib/deployments.ts` (hardened version, deployed on Arc Testnet at 0x061f5b2f0ae4cc0e1a6bb2ed17ebda265d694254).

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS
- Web3: wagmi v2, viem v2, ConnectKit
- Contracts: Solidity 0.8.28 + Foundry. Sources in `contracts/`, unit tests in `contracts/test/*.t.sol`. Build with `bun run contracts:build` (`forge build`), test with `bun run contracts:test` (`forge test`).
- Wallet: injected (MetaMask, etc.)
- Chain: Arc Testnet (Chain ID: 5042002, imported from `viem/chains`)
- Token: USDC (6 decimals) (Address: 0x3600000000000000000000000000000000000000, Chain: Arc Testnet)
- Toasts: Sonner

## Key Files

- `src/App.tsx` - Main application logic
- `src/components/` - UI components
- `src/config.ts` - wagmi config (chains, connectors, transports)

## To Run

```bash
bun install
bun run dev
```


## Handoff notes

- Work may continue outside Arc Studio (for example in Antigravity) and come back through GitHub. Read `HANDOFF.md` first; it lists what is safe to change.
- After pulling changes: run `bun install`, `bun run check`, regenerate `src/abi/*.ts` if contracts changed, check `src/lib/deployments.ts`, then test the wallet flows and the on-ramp backend (`bun run server`).
- The app needs no secrets or environment variables. Keep any future secrets in `.env` (git-ignored).
