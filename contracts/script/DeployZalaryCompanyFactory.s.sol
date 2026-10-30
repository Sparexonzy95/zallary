// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {ZalaryCompanyFactory} from "../ZalaryCompanyFactory.sol";

/// @notice Deploys the ZalaryCompanyFactory. Companies then deploy their own vaults through it.
/// @dev The factory has no owner and no admin powers, so the deployer key holds no authority afterwards.
///
/// Sign with a hardware wallet or an encrypted keystore, never a raw key in an env var or a file:
///
///   # 1. Dry run (simulates only, sends nothing)
///   forge script contracts/script/DeployZalaryCompanyFactory.s.sol:DeployZalaryCompanyFactory \
///     --rpc-url $ARC_RPC_URL --account <keystore-name>
///
///   # 2. Real deployment (adds --broadcast). On mainnet also set CONFIRM_MAINNET=I_UNDERSTAND.
///   forge script contracts/script/DeployZalaryCompanyFactory.s.sol:DeployZalaryCompanyFactory \
///     --rpc-url $ARC_RPC_URL --account <keystore-name> --broadcast
///
/// Chains: Arc Mainnet (5042) and Arc Testnet (5042002). Any other chain id reverts.
/// Optional env: USDC (default: canonical Arc USDC), CONFIRM_MAINNET (required on chain 5042).
contract DeployZalaryCompanyFactory is Script {
    uint256 internal constant ARC_MAINNET = 5042;
    uint256 internal constant ARC_TESTNET = 5042002;

    /// @dev Canonical USDC on Arc (ERC-20 view, 6 decimals).
    address internal constant ARC_USDC = 0x3600000000000000000000000000000000000000;

    function run() external returns (ZalaryCompanyFactory factory) {
        require(block.chainid == ARC_MAINNET || block.chainid == ARC_TESTNET, "Unsupported chain: use Arc");

        if (block.chainid == ARC_MAINNET) {
            require(
                keccak256(bytes(vm.envOr("CONFIRM_MAINNET", string("")))) == keccak256(bytes("I_UNDERSTAND")),
                "Set CONFIRM_MAINNET=I_UNDERSTAND to deploy to mainnet"
            );
        }

        address usdc = vm.envOr("USDC", ARC_USDC);
        require(usdc.code.length > 0, "USDC has no code on this chain");
        require(IERC20Metadata(usdc).decimals() == 6, "USDC must have 6 decimals");

        console2.log("Chain id:      ", block.chainid);
        console2.log("USDC:          ", usdc);

        vm.startBroadcast();
        factory = new ZalaryCompanyFactory(usdc);
        vm.stopBroadcast();

        require(address(factory.USDC()) == usdc, "Factory USDC mismatch");
        console2.log("Factory:       ", address(factory));
    }
}
