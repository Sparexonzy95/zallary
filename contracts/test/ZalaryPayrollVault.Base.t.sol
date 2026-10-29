// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ZalaryPayrollVault} from "../ZalaryPayrollVault.sol";
import {MockERC20} from "../test-helpers/MockERC20.sol";

/// @dev Shared fixture: no test functions here (every category inherits it).
abstract contract ZalaryPayrollVaultTestBase is Test {
    ZalaryPayrollVault internal vault;
    MockERC20 internal usdc;

    address internal admin = makeAddr("admin");
    address internal hr = makeAddr("hr");
    address internal fin = makeAddr("fin");
    address internal fin2 = makeAddr("fin2");
    address internal dual = makeAddr("dual"); // HR + FINANCE
    address internal feeRec = makeAddr("feeRec");
    address internal relayer = makeAddr("relayer");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal carol = makeAddr("carol");
    address internal rando = makeAddr("rando");

    bytes32 internal HR;
    bytes32 internal FIN;
    bytes32 internal RELAYER;
    bytes32 internal PAUSER;
    bytes32 internal ADMIN_ROLE = 0x00;

    uint48 internal constant ADMIN_DELAY = 1 days;
    uint256 internal constant FEE_BPS = 100; // 1%
    uint64 internal constant WEEK = 7 days;
    uint256 internal constant A_AMT = 1_000e6;
    uint256 internal constant B_AMT = 2_000e6;
    uint256 internal constant SIMPLE_TOTAL = 3_000e6;

    function setUp() public virtual {
        usdc = new MockERC20("Mock USDC", "mUSDC", 6);
        vault = new ZalaryPayrollVault(address(usdc), admin, ADMIN_DELAY, feeRec, FEE_BPS);
        HR = vault.HR_ROLE();
        FIN = vault.FINANCE_ROLE();
        RELAYER = vault.RELAYER_ROLE();
        PAUSER = vault.PAUSER_ROLE();

        vm.startPrank(admin);
        vault.grantRole(HR, hr);
        vault.grantRole(FIN, fin);
        vault.grantRole(FIN, fin2);
        vault.grantRole(HR, dual);
        vault.grantRole(FIN, dual);
        vault.grantRole(RELAYER, relayer);
        vm.stopPrank();
    }

    // ---------------------------------------------------------------- helpers

    function _id(uint256 n) internal pure returns (bytes32) {
        return keccak256(abi.encode("payroll", n));
    }

    function _arr(address a, uint256 x) internal pure returns (address[] memory e, uint256[] memory m) {
        e = new address[](1);
        m = new uint256[](1);
        e[0] = a;
        m[0] = x;
    }

    function _arr2(address a, uint256 x, address b, uint256 y)
        internal
        pure
        returns (address[] memory e, uint256[] memory m)
    {
        e = new address[](2);
        m = new uint256[](2);
        e[0] = a;
        m[0] = x;
        e[1] = b;
        m[1] = y;
    }

    function _sum(uint256[] memory m) internal pure returns (uint256 s) {
        for (uint256 i; i < m.length; ++i) s += m[i];
    }

    function _draftAs(address maker, bytes32 id, address[] memory e, uint256[] memory m) internal {
        uint256 total = _sum(m);
        uint64 dl = uint64(block.timestamp + WEEK);
        vm.prank(maker);
        vault.createPayrollDraft(id, dl, e, m, total);
    }

    function _draft(bytes32 id, address[] memory e, uint256[] memory m) internal {
        _draftAs(hr, id, e, m);
    }

    /// alice 1000e6 + bob 2000e6 draft by HR.
    function _draftSimple(bytes32 id) internal {
        (address[] memory e, uint256[] memory m) = _arr2(alice, A_AMT, bob, B_AMT);
        _draft(id, e, m);
    }

    /// Mints exactly total+fee to `who`, approves, and funds via fundPayroll.
    function _fundAs(address who, bytes32 id) internal {
        uint256 total = vault.getPayroll(id).totalFunded;
        (, uint256 charge) = vault.calculateFee(total);
        usdc.mint(who, charge);
        vm.startPrank(who);
        usdc.approve(address(vault), charge);
        vault.fundPayroll(id);
        vm.stopPrank();
    }

    function _fund(bytes32 id) internal {
        _fundAs(fin, id);
    }

    function _fundedSimple(bytes32 id) internal {
        _draftSimple(id);
        _fund(id);
    }

    /// Funded single-employee payroll.
    function _fundedSingle(bytes32 id, address emp, uint256 amt) internal {
        (address[] memory e, uint256[] memory m) = _arr(emp, amt);
        _draft(id, e, m);
        _fund(id);
    }

    function _status(bytes32 id) internal view returns (ZalaryPayrollVault.PayrollStatus) {
        return vault.getPayroll(id).status;
    }

    function _deadline(bytes32 id) internal view returns (uint64) {
        return vault.getPayroll(id).deadline;
    }

    function _expire(bytes32 id) internal {
        vm.warp(uint256(_deadline(id)) + 1);
    }
}
