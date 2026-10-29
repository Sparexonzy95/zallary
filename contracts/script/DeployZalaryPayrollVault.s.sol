// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {ZalaryPayrollVault} from "../ZalaryPayrollVault.sol";

/// @notice Deploys ZalaryPayrollVault and optionally grants the operational roles.
/// @dev Run from the project root (deployer key stays in an env var, never in a file):
///
///   forge script contracts/script/DeployZalaryPayrollVault.s.sol:DeployZalaryPayrollVault \
///     --rpc-url https://rpc.testnet.arc.io --broadcast
///
/// Required env: PRIVATE_KEY (deployer, becomes ADMIN), FEE_RECIPIENT
/// Optional env: USDC (default: Arc USDC), ADMIN_DELAY (seconds, default 86400),
///               FEE_BPS (default 25 = 0.25%, max 500), HR_ADDRESS, FINANCE_ADDRESS,
///               RELAYER_ADDRESS (roles are granted to these when set).
contract DeployZalaryPayrollVault is Script {
    /// @dev Canonical USDC on Arc (6-decimals ERC-20 view), same address on testnet and mainnet.
    address internal constant ARC_USDC = 0x3600000000000000000000000000000000000000;

    function run() external returns (ZalaryPayrollVault vault) {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address admin = vm.addr(deployerKey);

        address usdc = vm.envOr("USDC", ARC_USDC);
        address feeRecipient = vm.envAddress("FEE_RECIPIENT");
        uint256 feeBps = vm.envOr("FEE_BPS", uint256(25));
        uint48 adminDelay = uint48(vm.envOr("ADMIN_DELAY", uint256(1 days)));

        address hr = vm.envOr("HR_ADDRESS", address(0));
        address finance = vm.envOr("FINANCE_ADDRESS", address(0));
        address relayer = vm.envOr("RELAYER_ADDRESS", address(0));

        vm.startBroadcast(deployerKey);

        vault = new ZalaryPayrollVault(usdc, admin, adminDelay, feeRecipient, feeBps);

        if (hr != address(0)) vault.grantRole(vault.HR_ROLE(), hr);
        if (finance != address(0)) vault.grantRole(vault.FINANCE_ROLE(), finance);
        if (relayer != address(0)) vault.grantRole(vault.RELAYER_ROLE(), relayer);

        vm.stopBroadcast();

        console2.log("ZalaryPayrollVault:", address(vault));
        console2.log("admin:", admin);
        console2.log("feeRecipient:", feeRecipient);
    }
}
