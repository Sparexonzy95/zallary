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
cp .env.example .env   # add your own CIRCLE_API_KEY (testnet) for the on-ramp
bun run dev:all        # app on :5173 and on-ramp backend on :8787
```

Use `bun run dev` for the app alone. See `HANDOFF.md` for how to work on this project in another editor and hand it back.

Other commands:

```bash
bun run check            # lint and typecheck
bun run contracts:build  # compile the contracts
bun run contracts:test   # run the contract tests
```

The deployed company factory address on Arc Testnet is set in `src/lib/deployments.ts`. Redeploying the contracts means updating that address.

### Add USDC (on-ramp and bridge)

The **Add USDC** button lets a wallet buy USDC with a card or bank transfer (Circle Onramp) or bridge USDC from Ethereum, Base or Arbitrum Sepolia to Arc. The on-ramp needs a small backend that keeps the Circle API key on the server. Run it next to the app:

```bash
bun run server   # starts the backend on port 8787; Vite proxies /api to it
```

The app runs the on-ramp in Circle's test mode (no real money). The bridge needs no backend.

### Environment variables

- `CIRCLE_API_KEY`: Circle API key used by the on-ramp backend. Server only, never expose it in the browser.
- `ONRAMP_API_BASE_URL`: Circle Onramp API URL (test mode: `https://api-test.circle.com`).
- `VITE_ONRAMP_WIDGET_BASE_URL`: Circle Onramp widget URL (test mode: `https://onramp-sandbox.arc.io`).
- `ONRAMP_REFERRER_DOMAIN`: the website host that embeds the widget (`localhost` in test mode).
- `PORT`: optional, port of the on-ramp backend (default 8787).
