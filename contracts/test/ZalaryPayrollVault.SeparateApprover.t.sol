// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ZalaryPayrollVaultTestBase} from "./ZalaryPayrollVault.Base.t.sol";
import {ZalaryPayrollVault} from "../ZalaryPayrollVault.sol";

contract ZalaryPayrollVaultSeparateApproverTest is ZalaryPayrollVaultTestBase {
    bytes32 internal id1 = _id(1);
    bytes32 internal id2 = _id(2);

    function _setFlag(bool v) internal {
        vm.prank(admin);
        vault.setRequireSeparateApprover(v);
    }

    function _draftDual(bytes32 id) internal {
        (address[] memory e, uint256[] memory m) = _arr2(alice, A_AMT, bob, B_AMT);
        _draftAs(dual, id, e, m);
    }

    // ------------------------------------------------------------ default + toggle

    function test_DefaultIsFalse() public view {
        assertFalse(vault.requireSeparateApprover());
    }

    function test_Toggle_AdminSetsAndEmits() public {
        vm.expectEmit(false, false, false, true, address(vault));
        emit ZalaryPayrollVault.SeparateApproverUpdated(true);
        _setFlag(true);
        assertTrue(vault.requireSeparateApprover());

        vm.expectEmit(false, false, false, true, address(vault));
        emit ZalaryPayrollVault.SeparateApproverUpdated(false);
        _setFlag(false);
        assertFalse(vault.requireSeparateApprover());
    }

    function test_Toggle_SettingSameValueStillEmits() public {
        vm.expectEmit(false, false, false, true, address(vault));
        emit ZalaryPayrollVault.SeparateApproverUpdated(false);
        _setFlag(false);
        assertFalse(vault.requireSeparateApprover());
    }

    function test_Toggle_NonAdminReverts() public {
        address[5] memory callers = [hr, fin, dual, relayer, rando];
        for (uint256 i; i < callers.length; ++i) {
            vm.prank(callers[i]);
            vm.expectRevert(
                abi.encodeWithSignature("AccessControlUnauthorizedAccount(address,bytes32)", callers[i], ADMIN_ROLE)
            );
            vault.setRequireSeparateApprover(true);
        }
        assertFalse(vault.requireSeparateApprover());
    }

    function test_Toggle_WorksWhilePaused() public {
        vm.startPrank(admin);
        vault.pause();
        vault.setRequireSeparateApprover(true);
        vm.stopPrank();
        assertTrue(vault.requireSeparateApprover());
    }

    // ------------------------------------------------------------ flag off (default)

    function test_Off_SingleWalletWithHrAndFinanceCreatesThenFundsOwnDraft() public {
        _draftDual(id1);
        _fundAs(dual, id1);
        ZalaryPayrollVault.PayrollMeta memory p = vault.getPayroll(id1);
        assertEq(p.createdByHR, dual);
        assertEq(p.fundedByFinance, dual);
        assertEq(p.employer, dual);
        assertEq(uint8(p.status), uint8(ZalaryPayrollVault.PayrollStatus.FUNDED));
        assertEq(vault.totalEscrowed(), SIMPLE_TOTAL);
        assertEq(vault.getClaimableBalance(alice), A_AMT);
    }

    function test_Off_AdminHoldingFinanceCanFundHrDraft() public {
        vm.prank(admin);
        vault.grantRole(FIN, admin);
        _draftSimple(id1); // created by hr
        _fundAs(admin, id1);
        ZalaryPayrollVault.PayrollMeta memory p = vault.getPayroll(id1);
        assertEq(p.createdByHR, hr);
        assertEq(p.fundedByFinance, admin);
        assertEq(uint8(p.status), uint8(ZalaryPayrollVault.PayrollStatus.FUNDED));
    }

    function test_Off_AdminHoldingHrAndFinanceCanFundOwnDraft() public {
        vm.startPrank(admin);
        vault.grantRole(HR, admin);
        vault.grantRole(FIN, admin);
        vm.stopPrank();
        (address[] memory e, uint256[] memory m) = _arr2(alice, A_AMT, bob, B_AMT);
        _draftAs(admin, id1, e, m);
        _fundAs(admin, id1);
        assertEq(vault.getPayroll(id1).createdByHR, admin);
        assertEq(vault.getPayroll(id1).fundedByFinance, admin);
    }

    function test_Off_FinanceCanFundAdminPreparedDraft() public {
        vm.startPrank(admin);
        vault.grantRole(HR, admin);
        vm.stopPrank();
        (address[] memory e, uint256[] memory m) = _arr2(alice, A_AMT, bob, B_AMT);
        _draftAs(admin, id1, e, m);
        _fund(id1);
        assertEq(vault.getPayroll(id1).createdByHR, admin);
        assertEq(vault.getPayroll(id1).fundedByFinance, fin);
    }

    function test_Off_FundPayrollDirectWorks() public {
        (address[] memory e, uint256[] memory m) = _arr2(alice, A_AMT, bob, B_AMT);
        (, uint256 charge) = vault.calculateFee(SIMPLE_TOTAL);
        usdc.mint(dual, charge);
        vm.startPrank(dual);
        usdc.approve(address(vault), charge);
        vault.fundPayrollDirect(id1, uint64(block.timestamp + WEEK), e, m, SIMPLE_TOTAL);
        vm.stopPrank();
        assertEq(uint8(_status(id1)), uint8(ZalaryPayrollVault.PayrollStatus.FUNDED));
        assertEq(vault.getPayroll(id1).createdByHR, dual);
        assertEq(vault.getPayroll(id1).fundedByFinance, dual);
    }

    // ------------------------------------------------------------ flag on

    function test_On_BlocksSelfFundingOfExistingDraftButOtherFinanceCanFund() public {
        _draftDual(id1);
        _setFlag(true);

        (, uint256 charge) = vault.calculateFee(SIMPLE_TOTAL);
        usdc.mint(dual, charge);
        vm.startPrank(dual);
        usdc.approve(address(vault), charge);
        vm.expectRevert(ZalaryPayrollVault.SelfApprovalNotAllowed.selector);
        vault.fundPayroll(id1);
        vm.stopPrank();
        assertEq(uint8(_status(id1)), uint8(ZalaryPayrollVault.PayrollStatus.DRAFT));
        assertEq(vault.totalEscrowed(), 0);

        _fundAs(fin, id1);
        assertEq(uint8(_status(id1)), uint8(ZalaryPayrollVault.PayrollStatus.FUNDED));
        assertEq(vault.getPayroll(id1).fundedByFinance, fin);
        assertEq(vault.getPayroll(id1).createdByHR, dual);
    }

    function test_On_OtherDualWalletCanFundDraft() public {
        _setFlag(true);
        _draftSimple(id1); // hr
        _fundAs(dual, id1);
        assertEq(vault.getPayroll(id1).fundedByFinance, dual);
    }

    function test_On_AdminHoldingHrAndFinanceCannotFundOwnDraft() public {
        vm.startPrank(admin);
        vault.grantRole(HR, admin);
        vault.grantRole(FIN, admin);
        vm.stopPrank();
        (address[] memory e, uint256[] memory m) = _arr2(alice, A_AMT, bob, B_AMT);
        _draftAs(admin, id1, e, m);
        _setFlag(true);
        vm.prank(admin);
        vm.expectRevert(ZalaryPayrollVault.SelfApprovalNotAllowed.selector);
        vault.fundPayroll(id1);
    }

    function test_On_AdminHoldingFinanceCanStillFundHrDraft() public {
        vm.prank(admin);
        vault.grantRole(FIN, admin);
        _setFlag(true);
        _draftSimple(id1);
        _fundAs(admin, id1);
        assertEq(vault.getPayroll(id1).fundedByFinance, admin);
    }

    function test_On_FundPayrollDirectAlwaysReverts() public {
        _setFlag(true);
        (address[] memory e, uint256[] memory m) = _arr(alice, 10e6);
        (, uint256 charge) = vault.calculateFee(10e6);
        usdc.mint(dual, charge);
        vm.startPrank(dual);
        usdc.approve(address(vault), charge);
        vm.expectRevert(ZalaryPayrollVault.SelfApprovalNotAllowed.selector);
        vault.fundPayrollDirect(id1, uint64(block.timestamp + WEEK), e, m, 10e6);
        vm.stopPrank();
        assertFalse(vault.getPayroll(id1).exists);
    }

    function test_On_FundPayrollDirectNonDualStillRevertsRoleError() public {
        _setFlag(true);
        (address[] memory e, uint256[] memory m) = _arr(alice, 10e6);
        vm.prank(fin);
        vm.expectRevert(ZalaryPayrollVault.NotHR.selector);
        vault.fundPayrollDirect(id1, uint64(block.timestamp + WEEK), e, m, 10e6);
        vm.prank(hr);
        vm.expectRevert(ZalaryPayrollVault.NotFinance.selector);
        vault.fundPayrollDirect(id1, uint64(block.timestamp + WEEK), e, m, 10e6);
    }

    function test_On_StatusErrorTakesPrecedenceOverSelfApproval() public {
        _draftDual(id1);
        _fundAs(dual, id1); // funded while off
        _setFlag(true);
        vm.prank(dual);
        vm.expectRevert(
            abi.encodeWithSelector(
                ZalaryPayrollVault.InvalidPayrollStatus.selector, id1, ZalaryPayrollVault.PayrollStatus.FUNDED
            )
        );
        vault.fundPayroll(id1);
    }

    // ------------------------------------------------------------ toggling back

    function test_ToggleOff_UnblocksSelfFunding() public {
        _draftDual(id1);
        _setFlag(true);
        vm.prank(dual);
        vm.expectRevert(ZalaryPayrollVault.SelfApprovalNotAllowed.selector);
        vault.fundPayroll(id1);

        _setFlag(false);
        _fundAs(dual, id1);
        assertEq(uint8(_status(id1)), uint8(ZalaryPayrollVault.PayrollStatus.FUNDED));
        assertEq(vault.getPayroll(id1).fundedByFinance, dual);
    }

    // ------------------------------------------------------------ toggling never affects settled flows

    function test_Toggle_DoesNotAffectAlreadyFundedPayroll() public {
        _draftDual(id1);
        _fundAs(dual, id1);
        ZalaryPayrollVault.PayrollMeta memory before_ = vault.getPayroll(id1);

        _setFlag(true);
        ZalaryPayrollVault.PayrollMeta memory after_ = vault.getPayroll(id1);
        assertEq(uint8(after_.status), uint8(before_.status));
        assertEq(after_.employer, before_.employer);
        assertEq(after_.remainingEscrow, before_.remainingEscrow);
        assertEq(vault.totalEscrowed(), SIMPLE_TOTAL);
        assertEq(vault.getClaimableBalance(alice), A_AMT);
        assertEq(usdc.balanceOf(address(vault)), SIMPLE_TOTAL);
    }

    function test_Toggle_DoesNotAffectClaims() public {
        _draftDual(id1);
        _fundAs(dual, id1);
        _setFlag(true);

        vm.prank(alice);
        vault.claimSalary();
        assertEq(usdc.balanceOf(alice), A_AMT);

        _setFlag(false);
        vm.prank(relayer);
        vault.claimSalaryFor(bob);
        assertEq(usdc.balanceOf(bob), B_AMT);

        _setFlag(true);
        assertEq(vault.totalEscrowed(), 0);
        assertEq(uint8(_status(id1)), uint8(ZalaryPayrollVault.PayrollStatus.COMPLETED));
    }

    function test_Toggle_DoesNotAffectClaimPayrollSalary() public {
        _draftDual(id1);
        _fundAs(dual, id1);
        _setFlag(true);
        vm.prank(alice);
        vault.claimPayrollSalary(id1);
        assertEq(usdc.balanceOf(alice), A_AMT);
        assertEq(vault.totalEscrowed(), B_AMT);
    }

    function test_Toggle_DoesNotAffectRefundsToSelfFundedCreator() public {
        _draftDual(id1);
        _fundAs(dual, id1);
        _setFlag(true);
        _expire(id1);

        // dual both created and funded it; refund by dual (Finance) still works with flag on
        vm.prank(dual);
        vault.refundLeftover(id1, alice);
        assertEq(usdc.balanceOf(dual), A_AMT);

        _setFlag(false);
        vm.prank(fin);
        vault.refundLeftover(id1, bob);
        assertEq(usdc.balanceOf(dual), A_AMT + B_AMT); // refunds go to the original funder
        assertEq(vault.totalEscrowed(), 0);
        assertEq(uint8(_status(id1)), uint8(ZalaryPayrollVault.PayrollStatus.REFUNDED));
    }

    function test_Toggle_DoesNotAffectCancel() public {
        _draftDual(id1);
        _setFlag(true);
        vm.prank(dual);
        vault.cancelPayrollDraft(id1);
        assertEq(uint8(_status(id1)), uint8(ZalaryPayrollVault.PayrollStatus.CANCELLED));
    }

    function test_Toggle_DoesNotAffectDraftCreation() public {
        _setFlag(true);
        _draftDual(id1); // dual HR may still create drafts
        assertTrue(vault.getPayroll(id1).exists);
    }

    // ------------------------------------------------------------ fuzz

    function testFuzz_Flag_SelfFundOutcomeMatchesFlag(bool flag, uint256 amt) public {
        amt = bound(amt, 1, 1_000_000e6);
        _setFlag(flag);
        (address[] memory e, uint256[] memory m) = _arr(alice, amt);
        _draftAs(dual, id1, e, m);
        (, uint256 charge) = vault.calculateFee(amt);
        usdc.mint(dual, charge);
        vm.startPrank(dual);
        usdc.approve(address(vault), charge);
        if (flag) vm.expectRevert(ZalaryPayrollVault.SelfApprovalNotAllowed.selector);
        vault.fundPayroll(id1);
        vm.stopPrank();
        if (flag) {
            assertEq(vault.totalEscrowed(), 0);
            assertEq(usdc.balanceOf(address(vault)), 0);
        } else {
            assertEq(vault.totalEscrowed(), amt);
            assertEq(usdc.balanceOf(address(vault)), amt);
        }
    }
}
