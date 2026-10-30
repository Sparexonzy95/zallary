# Zalary Payroll

Institutional USDC payroll on Arc. A wallet creates a company, assigns HR and Finance, HR prepares payroll drafts, Finance reviews and funds them, and employees claim their pay straight to their wallet.

Built with [Arc Studio](https://studio.arc.io)

## Tech stack

- React 18, Vite, TypeScript, Tailwind CSS
- wagmi, viem, ConnectKit for wallet connection
- Solidity 0.8.28 and Foundry for the contracts (`contracts/`)
- Arc Testnet and USDC

## Development

Prerequisites: [Bun](https://bun.sh) and [Foundry](https://book.getfoundry.sh).

```bash
bun install
bun run dev            # app on :5173
```

See `HANDOFF.md` for how to work on this project in another editor and hand it back.

Other commands:

```bash
bun run check            # lint and typecheck
bun run contracts:build  # compile the contracts
bun run contracts:test   # run the contract tests
```

The deployed company factory address on Arc Testnet is set in `src/lib/deployments.ts`. Redeploying the contracts means updating that address.

### Add USDC

The **Add USDC** button lets a wallet bridge USDC from Ethereum, Base or Arbitrum Sepolia to Arc. Buying USDC with a card or bank transfer is marked "coming soon". The app has no backend and needs no server.

### Environment variables

None.
