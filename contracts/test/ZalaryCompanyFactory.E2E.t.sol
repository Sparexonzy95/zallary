// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {ZalaryCompanyFactory} from "../ZalaryCompanyFactory.sol";
import {ZalaryPayrollVault} from "../ZalaryPayrollVault.sol";
import {MockERC20} from "../test-helpers/MockERC20.sol";

contract ZalaryCompanyFactoryE2ETest is Test {
    ZalaryCompanyFactory internal factory;
    MockERC20 internal usdc;

    address internal creatorA = makeAddr("creatorA");
    address internal creatorB = makeAddr("creatorB");
    address internal feeRec = makeAddr("feeRec");
    address internal hr = makeAddr("hr");
    address internal fin = makeAddr("fin");
    address internal emp = makeAddr("emp");
    address internal emp2 = makeAddr("emp2");

    ZalaryPayrollVault internal vaultA;
    ZalaryPayrollVault internal vaultB;

    function setUp() public {
        usdc = new MockERC20("Mock USDC", "mUSDC", 6);
        factory = new ZalaryCompanyFactory(address(usdc));
        vaultA = _company(creatorA, "A");
        vaultB = _company(creatorB, "B");
    }

    function _company(address who, string memory name) internal returns (ZalaryPayrollVault) {
        vm.prank(who);
        (, address v) = factory.createCompany(name, 1 days, feeRec, 100);
        return ZalaryPayrollVault(v);
    }

    function test_E2E_CreateGrantDraftFundClaim() public {
        bytes32 hrRole = vaultA.HR_ROLE();
        bytes32 finRole = vaultA.FINANCE_ROLE();
        vm.startPrank(creatorA);
        vaultA.grantRole(hrRole, hr);
        vaultA.grantRole(finRole, fin);
        vm.stopPrank();
        assertTrue(vaultA.hasRole(hrRole, hr));
        assertTrue(vaultA.hasRole(finRole, fin));

        address[] memory e = new address[](2);
        uint256[] memory m = new uint256[](2);
        e[0] = emp;
        m[0] = 1_000e6;
        e[1] = emp2;
        m[1] = 2_000e6;
        bytes32 pid = keccak256("payroll-1");

        vm.prank(hr);
        vaultA.createPayrollDraft(pid, uint64(block.timestamp + 7 days), e, m, 3_000e6);

        (uint256 fee, uint256 charge) = vaultA.calculateFee(3_000e6);
        assertEq(fee, 30e6);
        usdc.mint(fin, charge);
        vm.startPrank(fin);
        usdc.approve(address(vaultA), charge);
        vaultA.fundPayroll(pid);
        vm.stopPrank();

        assertEq(usdc.balanceOf(address(vaultA)), 3_000e6);
        assertEq(usdc.balanceOf(feeRec), fee);
        assertEq(vaultA.totalEscrowed(), 3_000e6);
        assertEq(vaultA.getClaimableBalance(emp), 1_000e6);

        vm.prank(emp);
        vaultA.claimSalary();
        assertEq(usdc.balanceOf(emp), 1_000e6);
        assertEq(vaultA.getClaimableBalance(emp), 0);
        assertEq(vaultA.totalEscrowed(), 2_000e6);

        vm.prank(emp2);
        vaultA.claimPayrollSalary(pid);
        assertEq(usdc.balanceOf(emp2), 2_000e6);
        assertEq(usdc.balanceOf(address(vaultA)), 0);
        assertEq(uint8(vaultA.getPayroll(pid).status), uint8(ZalaryPayrollVault.PayrollStatus.COMPLETED));

        // factory never touched funds
        assertEq(usdc.balanceOf(address(factory)), 0);
    }

    function test_Admin_CannotActAsHRorFinance() public {
        bytes32 pid = keccak256("p");
        address[] memory e = new address[](1);
        uint256[] memory m = new uint256[](1);
        e[0] = emp;
        m[0] = 1e6;
        vm.prank(creatorA);
        vm.expectRevert(ZalaryPayrollVault.NotHR.selector);
        vaultA.createPayrollDraft(pid, uint64(block.timestamp + 1 days), e, m, 1e6);
    }

    function test_CrossCompany_AdminBCannotGrantRolesOnA() public {
        bytes32 hrRole = vaultA.HR_ROLE();
        vm.prank(creatorB);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, creatorB, bytes32(0))
        );
        vaultA.grantRole(hrRole, creatorB);
        assertFalse(vaultA.hasRole(hrRole, creatorB));
    }

    function test_CrossCompany_AdminBCannotPauseOrConfigureA() public {
        bytes32 pauser = vaultA.PAUSER_ROLE();
        vm.prank(creatorB);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, creatorB, pauser)
        );
        vaultA.pause();

        vm.prank(creatorB);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, creatorB, bytes32(0))
        );
        vaultA.setProtocolFee(0, creatorB);

        vm.prank(creatorB);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, creatorB, bytes32(0))
        );
        vaultA.rescueToken(address(usdc), creatorB, 1);

        assertFalse(vaultA.paused());
        assertEq(vaultA.feeBps(), 100);
    }

    function test_CrossCompany_HRofACannotDraftOnB() public {
        bytes32 hrRole = vaultA.HR_ROLE();
        vm.prank(creatorA);
        vaultA.grantRole(hrRole, hr);

        address[] memory e = new address[](1);
        uint256[] memory m = new uint256[](1);
        e[0] = emp;
        m[0] = 1e6;
        vm.prank(hr);
        vm.expectRevert(ZalaryPayrollVault.NotHR.selector);
        vaultB.createPayrollDraft(keccak256("p"), uint64(block.timestamp + 1 days), e, m, 1e6);
    }

    function test_CrossCompany_PausingAdoesNotPauseB() public {
        vm.prank(creatorA);
        vaultA.pause();
        assertTrue(vaultA.paused());
        assertFalse(vaultB.paused());
    }
}
