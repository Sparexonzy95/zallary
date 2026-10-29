// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Vm} from "forge-std/Vm.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {ZalaryPayrollVaultTestBase} from "./ZalaryPayrollVault.Base.t.sol";
import {ZalaryPayrollVault} from "../ZalaryPayrollVault.sol";

contract ZalaryPayrollVaultFundTest is ZalaryPayrollVaultTestBase {
    bytes32 internal id1 = _id(1);
    bytes32 internal id2 = _id(2);

    // ------------------------------------------------------------ fundPayroll

    function test_Fund_HappyPath_StateAndBalances() public {
        _draftSimple(id1);
        (uint256 fee, uint256 charge) = vault.calculateFee(SIMPLE_TOTAL);
        assertEq(fee, 30e6); // 1% of 3000
        assertEq(charge, SIMPLE_TOTAL + fee);

        usdc.mint(fin, charge);
        vm.startPrank(fin);
        usdc.approve(address(vault), charge);
        vault.fundPayroll(id1);
        vm.stopPrank();

        // total + fee pulled from Finance wallet; fee goes to feeRecipient; salary stays in vault
        assertEq(usdc.balanceOf(fin), 0);
        assertEq(usdc.balanceOf(feeRec), fee);
        assertEq(usdc.balanceOf(address(vault)), SIMPLE_TOTAL);
        assertEq(vault.totalEscrowed(), SIMPLE_TOTAL);
        assertEq(vault.totalProtocolFeesCollected(), fee);

        ZalaryPayrollVault.PayrollMeta memory p = vault.getPayroll(id1);
        assertEq(p.employer, fin);
        assertEq(p.fundedByFinance, fin);
        assertEq(p.remainingEscrow, SIMPLE_TOTAL);
        assertEq(p.protocolFeePaid, fee);
        assertEq(uint8(p.status), uint8(ZalaryPayrollVault.PayrollStatus.FUNDED));

        assertEq(vault.getClaimableBalance(alice), A_AMT);
        assertEq(vault.getClaimableBalance(bob), B_AMT);
        assertEq(vault.openPayrollCount(alice), 1);
        assertEq(vault.openPayrollCount(bob), 1);
    }

    function test_Fund_EmitsFeeAndFundedEvents() public {
        _draftSimple(id1);
        (uint256 fee, uint256 charge) = vault.calculateFee(SIMPLE_TOTAL);
        usdc.mint(fin, charge);
        vm.startPrank(fin);
        usdc.approve(address(vault), charge);
        vm.expectEmit(true, true, false, true, address(vault));
        emit ZalaryPayrollVault.ProtocolFeeCollected(id1, feeRec, fee);
        vm.expectEmit(true, true, false, true, address(vault));
        emit ZalaryPayrollVault.PayrollFunded(id1, fin, SIMPLE_TOTAL, 2, _deadline(id1), fee);
        vault.fundPayroll(id1);
        vm.stopPrank();
    }

    function test_Fund_ZeroFee_NoFeeTransferOrEvent() public {
        vm.prank(admin);
        vault.setProtocolFee(0, feeRec);
        _draftSimple(id1);
        vm.recordLogs();
        _fund(id1);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        bytes32 feeTopic = ZalaryPayrollVault.ProtocolFeeCollected.selector;
        for (uint256 i; i < logs.length; ++i) {
            assertTrue(logs[i].topics[0] != feeTopic, "unexpected ProtocolFeeCollected");
        }
        assertEq(usdc.balanceOf(feeRec), 0);
        assertEq(usdc.balanceOf(address(vault)), SIMPLE_TOTAL);
        assertEq(vault.getPayroll(id1).protocolFeePaid, 0);
    }

    function test_Fund_MaxFee_FivePercent() public {
        vm.prank(admin);
        vault.setProtocolFee(500, feeRec);
        _draftSimple(id1);
        (uint256 fee, uint256 charge) = vault.calculateFee(SIMPLE_TOTAL);
        assertEq(fee, 150e6);
        assertEq(charge, 3150e6);
        _fund(id1);
        assertEq(usdc.balanceOf(feeRec), 150e6);
        assertEq(usdc.balanceOf(address(vault)), SIMPLE_TOTAL);
    }

    function test_Fund_RevertsForNonFinance() public {
        _draftSimple(id1);
        vm.prank(rando);
        vm.expectRevert(ZalaryPayrollVault.NotFinance.selector);
        vault.fundPayroll(id1);
    }

    function test_Fund_RevertsUnknownPayroll() public {
        vm.prank(fin);
        vm.expectRevert(abi.encodeWithSelector(ZalaryPayrollVault.PayrollNotFound.selector, id1));
        vault.fundPayroll(id1);
    }

    function test_Fund_RevertsAlreadyFunded() public {
        _fundedSimple(id1);
        vm.prank(fin);
        vm.expectRevert(
            abi.encodeWithSelector(
                ZalaryPayrollVault.InvalidPayrollStatus.selector, id1, ZalaryPayrollVault.PayrollStatus.FUNDED
            )
        );
        vault.fundPayroll(id1);
    }

    function test_Fund_RevertsAfterDeadline() public {
        _draftSimple(id1);
        _expire(id1);
        vm.prank(fin);
        vm.expectRevert(ZalaryPayrollVault.InvalidDeadline.selector);
        vault.fundPayroll(id1);
    }

    function test_Fund_RevertsAtDeadlineExactly() public {
        _draftSimple(id1);
        vm.warp(_deadline(id1));
        vm.prank(fin);
        vm.expectRevert(ZalaryPayrollVault.InvalidDeadline.selector);
        vault.fundPayroll(id1);
    }

    function test_Fund_RevertsInsufficientAllowance() public {
        _draftSimple(id1);
        (, uint256 charge) = vault.calculateFee(SIMPLE_TOTAL);
        usdc.mint(fin, charge);
        // approve only the salary total, not total+fee
        vm.startPrank(fin);
        usdc.approve(address(vault), SIMPLE_TOTAL);
        vm.expectRevert(
            abi.encodeWithSelector(
                IERC20Errors.ERC20InsufficientAllowance.selector, address(vault), SIMPLE_TOTAL, charge
            )
        );
        vault.fundPayroll(id1);
        vm.stopPrank();
    }

    function test_Fund_RevertsInsufficientBalance() public {
        _draftSimple(id1);
        (, uint256 charge) = vault.calculateFee(SIMPLE_TOTAL);
        usdc.mint(fin, charge - 1);
        vm.startPrank(fin);
        usdc.approve(address(vault), charge);
        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientBalance.selector, fin, charge - 1, charge)
        );
        vault.fundPayroll(id1);
        vm.stopPrank();
    }

    function test_Fund_RevertsWhenPaused() public {
        _draftSimple(id1);
        vm.prank(admin);
        vault.pause();
        vm.prank(fin);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vault.fundPayroll(id1);
    }

    // ------------------------------------------------------------ maker-checker

    function test_MakerChecker_DualRoleCannotFundOwnDraft() public {
        vm.prank(admin);
        vault.setRequireSeparateApprover(true);
        (address[] memory e, uint256[] memory m) = _arr2(alice, A_AMT, bob, B_AMT);
        _draftAs(dual, id1, e, m);
        vm.prank(dual);
        vm.expectRevert(ZalaryPayrollVault.SelfApprovalNotAllowed.selector);
        vault.fundPayroll(id1);
    }

    function test_MakerChecker_DefaultOffDualRoleCanFundOwnDraft() public {
        (address[] memory e, uint256[] memory m) = _arr2(alice, A_AMT, bob, B_AMT);
        _draftAs(dual, id1, e, m);
        _fundAs(dual, id1);
        assertEq(vault.getPayroll(id1).fundedByFinance, dual);
        assertEq(vault.getPayroll(id1).createdByHR, dual);
    }

    function test_Direct_RevertsSelfApprovalWhenFlagOn() public {
        vm.prank(admin);
        vault.setRequireSeparateApprover(true);
        (address[] memory e, uint256[] memory m) = _arr2(alice, A_AMT, bob, B_AMT);
        (, uint256 charge) = vault.calculateFee(SIMPLE_TOTAL);
        usdc.mint(dual, charge);
        vm.startPrank(dual);
        usdc.approve(address(vault), charge);
        vm.expectRevert(ZalaryPayrollVault.SelfApprovalNotAllowed.selector);
        vault.fundPayrollDirect(id1, uint64(block.timestamp + WEEK), e, m, SIMPLE_TOTAL);
        vm.stopPrank();
        // whole tx rolled back
        assertFalse(vault.getPayroll(id1).exists);
        assertEq(usdc.balanceOf(dual), charge);
    }

    function test_MakerChecker_DualRoleCanFundOtherHrsDraft() public {
        _draftSimple(id1); // created by hr
        _fundAs(dual, id1);
        assertEq(vault.getPayroll(id1).fundedByFinance, dual);
        assertEq(vault.getPayroll(id1).createdByHR, hr);
    }

    function test_MakerChecker_FinanceCanFundDualRolesDraft() public {
        (address[] memory e, uint256[] memory m) = _arr2(alice, A_AMT, bob, B_AMT);
        _draftAs(dual, id1, e, m);
        _fund(id1);
        assertEq(vault.getPayroll(id1).fundedByFinance, fin);
    }

    // ------------------------------------------------------------ fundPayrollDirect

    function test_Direct_DualRoleCreatesAndFundsAtomically() public {
        (address[] memory e, uint256[] memory m) = _arr2(alice, A_AMT, bob, B_AMT);
        (uint256 fee, uint256 charge) = vault.calculateFee(SIMPLE_TOTAL);
        uint64 dl = uint64(block.timestamp + WEEK);
        usdc.mint(dual, charge);
        vm.startPrank(dual);
        usdc.approve(address(vault), charge);
        vm.expectEmit(true, true, false, true, address(vault));
        emit ZalaryPayrollVault.PayrollDraftCreated(id1, dual, SIMPLE_TOTAL, 2, dl);
        vm.expectEmit(true, true, false, true, address(vault));
        emit ZalaryPayrollVault.PayrollFunded(id1, dual, SIMPLE_TOTAL, 2, dl, fee);
        vault.fundPayrollDirect(id1, dl, e, m, SIMPLE_TOTAL);
        vm.stopPrank();

        ZalaryPayrollVault.PayrollMeta memory p = vault.getPayroll(id1);
        assertEq(p.createdByHR, dual);
        assertEq(p.employer, dual);
        assertEq(uint8(p.status), uint8(ZalaryPayrollVault.PayrollStatus.FUNDED));
        assertEq(usdc.balanceOf(dual), 0);
        assertEq(usdc.balanceOf(feeRec), fee);
        assertEq(usdc.balanceOf(address(vault)), SIMPLE_TOTAL);
        assertEq(vault.getClaimableBalance(alice), A_AMT);
    }

    function test_Direct_FinanceOnlyReverts() public {
        (address[] memory e, uint256[] memory m) = _arr(alice, 10e6);
        vm.prank(fin);
        vm.expectRevert(ZalaryPayrollVault.NotHR.selector);
        vault.fundPayrollDirect(id1, uint64(block.timestamp + WEEK), e, m, 10e6);
    }

    function test_Direct_HrOnlyReverts() public {
        (address[] memory e, uint256[] memory m) = _arr(alice, 10e6);
        vm.prank(hr);
        vm.expectRevert(ZalaryPayrollVault.NotFinance.selector);
        vault.fundPayrollDirect(id1, uint64(block.timestamp + WEEK), e, m, 10e6);
    }

    function test_Direct_AdminAndRandoRevert() public {
        (address[] memory e, uint256[] memory m) = _arr(alice, 10e6);
        vm.prank(admin);
        vm.expectRevert(ZalaryPayrollVault.NotFinance.selector);
        vault.fundPayrollDirect(id1, uint64(block.timestamp + WEEK), e, m, 10e6);
        vm.prank(rando);
        vm.expectRevert(ZalaryPayrollVault.NotFinance.selector);
        vault.fundPayrollDirect(id1, uint64(block.timestamp + WEEK), e, m, 10e6);
    }

    function test_Direct_RevertsOnInvalidDraftInputs() public {
        (address[] memory e, uint256[] memory m) = _arr(alice, 10e6);
        vm.prank(dual);
        vm.expectRevert(abi.encodeWithSelector(ZalaryPayrollVault.TotalAmountMismatch.selector, 9e6, 10e6));
        vault.fundPayrollDirect(id1, uint64(block.timestamp + WEEK), e, m, 9e6);
    }

    function test_Direct_RevertsDuplicateIdAndWhenPaused() public {
        (address[] memory e, uint256[] memory m) = _arr(alice, 10e6);
        _draftSimple(id1);
        vm.prank(dual);
        vm.expectRevert(abi.encodeWithSelector(ZalaryPayrollVault.PayrollAlreadyExists.selector, id1));
        vault.fundPayrollDirect(id1, uint64(block.timestamp + WEEK), e, m, 10e6);

        vm.prank(admin);
        vault.pause();
        vm.prank(dual);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vault.fundPayrollDirect(id2, uint64(block.timestamp + WEEK), e, m, 10e6);
    }

    function test_Direct_RevertsWithoutAllowance() public {
        (address[] memory e, uint256[] memory m) = _arr(alice, 10e6);
        vm.prank(dual);
        vm.expectRevert();
        vault.fundPayrollDirect(id1, uint64(block.timestamp + WEEK), e, m, 10e6);
        // whole tx rolled back: payroll id still unused
        assertFalse(vault.getPayroll(id1).exists);
    }

    // ------------------------------------------------------------ fee config

    function test_SetFee_AdminUpdatesAndEmits() public {
        vm.prank(admin);
        vm.expectEmit(true, false, false, true, address(vault));
        emit ZalaryPayrollVault.ProtocolFeeUpdated(250, rando);
        vault.setProtocolFee(250, rando);
        assertEq(vault.feeBps(), 250);
        assertEq(vault.feeRecipient(), rando);
    }

    function test_SetFee_AcceptsCapRevertsAbove() public {
        vm.prank(admin);
        vault.setProtocolFee(500, feeRec);
        assertEq(vault.feeBps(), 500);
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(ZalaryPayrollVault.FeeTooHigh.selector, 501, 500));
        vault.setProtocolFee(501, feeRec);
    }

    function test_SetFee_RevertsZeroRecipient() public {
        vm.prank(admin);
        vm.expectRevert(ZalaryPayrollVault.ZeroAddress.selector);
        vault.setProtocolFee(100, address(0));
    }

    function test_SetFee_RevertsForNonAdmin() public {
        vm.prank(hr);
        vm.expectRevert(
            abi.encodeWithSignature("AccessControlUnauthorizedAccount(address,bytes32)", hr, ADMIN_ROLE)
        );
        vault.setProtocolFee(100, feeRec);
    }

    function test_SetFee_AppliesOnlyToFutureFunding() public {
        _draftSimple(id1);
        _draftSimple(id2);
        _fund(id1); // 1% fee
        vm.prank(admin);
        vault.setProtocolFee(200, rando);
        _fund(id2); // 2% fee, to rando
        assertEq(vault.getPayroll(id1).protocolFeePaid, 30e6);
        assertEq(vault.getPayroll(id2).protocolFeePaid, 60e6);
        assertEq(usdc.balanceOf(feeRec), 30e6);
        assertEq(usdc.balanceOf(rando), 60e6);
        assertEq(vault.totalProtocolFeesCollected(), 90e6);
    }

    function test_CalculateFee_RoundsDown() public view {
        (uint256 fee, uint256 total) = vault.calculateFee(99); // 1% of 99 = 0.99 -> 0
        assertEq(fee, 0);
        assertEq(total, 99);
        (fee, total) = vault.calculateFee(199); // 1.99 -> 1
        assertEq(fee, 1);
        assertEq(total, 200);
    }
}
