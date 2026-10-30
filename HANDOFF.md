# Handoff guide

For anyone (or any coding agent) picking this project up outside Arc Studio, for example in Antigravity.

## What this is

Zalary: institutional USDC payroll on Arc Testnet. A wallet creates a company, the admin assigns HR and Finance, HR prepares payroll drafts, Finance funds them, and employees claim their pay. Funds can also be added through a card or bank on-ramp (Circle test mode) or by bridging USDC from another test network.

## Run it

Prerequisites: [Bun](https://bun.sh). [Foundry](https://book.getfoundry.sh) is only needed to change or test the contracts.

```bash
bun install
bun run dev               # app on :5173
```

The app has no backend and needs no environment variables. The **Card / Bank** tab in Add USDC is a "coming soon" placeholder.

You need a wallet on Arc Testnet with test USDC (gas is paid in USDC on Arc). Faucet: https://faucet.circle.com

## Before you hand it back

```bash
bun run check             # lint and typecheck, must show 0 errors
bun run contracts:test    # only if you touched contracts/
```

## Safe to change

- Anything visual: `src/components/*`, `src/index.css`, layout, copy, spacing, animation, empty and error states.
- The design tokens live in `src/index.css` (`:root`). Theme: canvas `#080808`, cards `#151515`, accent `#FE9E15`, success `#38d996`.
- App structure: `src/App.tsx` (routing through `?company=0x…&portal=hr|finance|employee|institution`), `src/lib/portals.ts` (which role opens which area).

## Change with care

- `src/abi/*.ts` are generated from the contracts (`contracts/out/`). If a contract changes, run `forge build` and regenerate them. Do not edit by hand.
- `src/lib/deployments.ts` holds the deployed factory address on Arc Testnet. If the contracts are redeployed, update it. Companies made with an older factory keep working but keep their old rules.
- Money maths: use `@/onchain-money` and `@/onchain-facts` (USDC address, decimals, explorer links). Never hardcode a USDC address or `6` decimals.
- Contract calls go through `src/hooks/useTx.ts` (switches chain, waits for the receipt, refreshes data, shows plain-language errors from `src/lib/errors.ts`). Keep new writes on it.
- `src/onchain-*.ts`, `src/tracing.ts`, `src/console-capture.ts`, `scripts/`: generated or platform files. Leave them.

## Contracts

`contracts/ZalaryCompanyFactory.sol` (creates a company vault per wallet) and `contracts/ZalaryPayrollVault.sol` (roles, drafts, funding, claims, refunds, fee, pause). Tests are in `contracts/test/` (244 passing). Design notes: `contracts/ZalaryPayrollVault-design.md`.

Product decisions already made:
- Each company sets its own fee (maximum 5%).
- Funding pulls USDC from the Finance wallet. Refunds go back to that wallet.
- By default any wallet with the Finance role can fund any draft. The admin can switch on "two people required".
- Employees claim for themselves. The Relayer role exists in the contract but the app has no gasless flow.

## Good next steps

- Visual polish across all four areas (HR, Finance, My pay, Governance), especially mobile.
- Loading, empty and error states.
- Payroll names are saved only in the browser that created them. Storing them somewhere shared would help.
- Show payroll history with claimed and unclaimed amounts per employee.

## What to tell Arc Studio after you push

Say what you changed and which branch. It will pull the changes and test them, including the wallet flows and the contract interactions.
