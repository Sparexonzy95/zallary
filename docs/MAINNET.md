# Deploying Zalary to Arc Mainnet

Transactions on mainnet use real funds and cannot be undone. You deploy from your own wallet. Arc Studio does not deploy to mainnet for you.

Do not continue until the checklist below is done.

## Before you deploy

- [ ] The contracts got an internal review and 272 passing tests. That is **not** an independent audit. Get an independent professional audit of `contracts/ZalaryPayrollVault.sol` and `contracts/ZalaryCompanyFactory.sol` first.
- [ ] You ran the full flow on Arc Testnet with separate owner, HR, Finance and employee wallets.
- [ ] You checked the USDC address below against Circle's official documentation.
- [ ] The deployer wallet has a little USDC for gas on Arc Mainnet (gas is paid in USDC on Arc).
- [ ] You use a hardware wallet or an encrypted keystore. Never put a raw private key in a file, a chat or a shell history.

## Facts

| Item | Value |
| --- | --- |
| Network | Arc Mainnet |
| Chain id | `5042` |
| RPC | `https://rpc.mainnet.arc.io` |
| Explorer | `https://explorer.arc.io` |
| USDC (ERC-20 view, 6 decimals) | `0x3600000000000000000000000000000000000000` |

The factory has no owner and no admin powers. The deployer key holds no authority after deployment. Each company's creator becomes the admin of that company's own vault.

## 1. Dry run (sends nothing)

```bash
export ARC_RPC_URL=https://rpc.mainnet.arc.io
CONFIRM_MAINNET=I_UNDERSTAND forge script \
  contracts/script/DeployZalaryCompanyFactory.s.sol:DeployZalaryCompanyFactory \
  --rpc-url $ARC_RPC_URL --account <keystore-name>
```

Expect `Script ran successfully`, `Chain id: 5042` and the USDC address above. Without `CONFIRM_MAINNET=I_UNDERSTAND` the script refuses to run on mainnet.

To create a keystore: `cast wallet import <keystore-name> --interactive`. For a Ledger, replace `--account` with `--ledger`.

## 2. Deploy

Same command with `--broadcast` added. Write down the printed `Factory:` address.

```bash
CONFIRM_MAINNET=I_UNDERSTAND forge script \
  contracts/script/DeployZalaryCompanyFactory.s.sol:DeployZalaryCompanyFactory \
  --rpc-url $ARC_RPC_URL --account <keystore-name> --broadcast
```

## 3. Verify it

```bash
cast call <FACTORY> "USDC()(address)" --rpc-url $ARC_RPC_URL     # must equal the USDC address above
cast call <FACTORY> "companyCount()(uint256)" --rpc-url $ARC_RPC_URL   # 0
cast code <FACTORY> --rpc-url $ARC_RPC_URL | head -c 40            # not 0x
```

Open the factory on https://explorer.arc.io and verify the source code there if the explorer allows it.

## 4. Point the app at it

Set the factory address in one of two ways:

- Edit `MAINNET_FACTORY` in `src/lib/deployments.ts`, or
- set the build variable `VITE_FACTORY_ADDRESS=<FACTORY>` (for example in Vercel).

Build the app for mainnet with `VITE_NETWORK=mainnet`. Without it the build targets Arc Testnet.

```bash
VITE_NETWORK=mainnet bun run build   # or: VITE_NETWORK=mainnet bunx vite build
```

## 5. Smoke test with small amounts

Create a test company, assign HR and Finance, fund a payroll of 1 USDC and claim it. Check each transaction on the explorer. Only then invite real users.

## Hand-off

If Gemini or another person runs the deployment, give them this file and never share keys. Tell Arc Studio the factory address afterwards and it will update `src/lib/deployments.ts`, run the checks and test the app.
