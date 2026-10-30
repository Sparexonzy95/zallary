// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ZalaryPayrollVaultTestBase} from "./ZalaryPayrollVault.Base.t.sol";
import {ZalaryPayrollVault} from "../ZalaryPayrollVault.sol";

contract ZalaryPayrollVaultRefundTest is ZalaryPayrollVaultTestBase {
    bytes32 internal id1 = _id(1);

    function _fundedSimpleBy(address who, bytes32 id) internal {
        _draftSimple(id);
        _fundAs(who, id);
    }

    function test_Refund_HappyPath_ToFundingWalletAndEvent() public {
        _fundedSimpleBy(fin2, id1);
        _expire(id1);
        uint256 before = usdc.balanceOf(fin2);

        vm.prank(fin); // a different Finance member triggers it
        vm.expectEmit(true, true, true, true, address(vault));
        emit ZalaryPayrollVault.LeftoverRefunded(id1, fin2, alice, A_AMT);
        vault.refundLeftover(id1, alice);

        assertEq(usdc.balanceOf(fin2), before + A_AMT, "refund goes to funding wallet");
        assertEq(usdc.balanceOf(fin), 0, "caller gets nothing");
        assertEq(usdc.balanceOf(alice), 0);
        assertEq(usdc.balanceOf(address(vault)), B_AMT);
        assertEq(vault.totalEscrowed(), B_AMT);
        assertEq(vault.getPayroll(id1).remainingEscrow, B_AMT);
        assertEq(vault.getClaimableBalance(alice), 0);
        assertEq(vault.openPayrollCount(alice), 0);
        assertTrue(vault.getAllocation(id1, alice).refunded);
        // bob still unsettled -> still FUNDED
        assertEq(uint8(_status(id1)), uint8(ZalaryPayrollVault.PayrollStatus.FUNDED));
    }

    function test_Refund_RevertsBeforeAndAtDeadline() public {
        _fundedSimple(id1);
        uint64 dl = _deadline(id1);
        vm.prank(fin);
        vm.expectRevert(abi.encodeWithSelector(ZalaryPayrollVault.PayrollNotExpired.selector, id1, dl));
        vault.refundLeftover(id1, alice);

        vm.warp(dl); // exactly at the deadline: still not expired
        vm.prank(fin);
        vm.expectRevert(abi.encodeWithSelector(ZalaryPayrollVault.PayrollNotExpired.selector, id1, dl));
        vault.refundLeftover(id1, alice);

        vm.warp(uint256(dl) + 1);
        vm.prank(fin);
        vault.refundLeftover(id1, alice);
        assertEq(usdc.balanceOf(fin), A_AMT);
    }

    function test_Refund_OnlyFinance() public {
        _fundedSimple(id1);
        _expire(id1);
        address[3] memory bad = [hr, admin, rando];
        for (uint256 i; i < 3; ++i) {
            vm.prank(bad[i]);
            vm.expectRevert(ZalaryPayrollVault.NotFinance.selector);
            vault.refundLeftover(id1, alice);
        }
        vm.prank(relayer);
        vm.expectRevert(ZalaryPayrollVault.NotFinance.selector);
        vault.refundLeftover(id1, alice);
    }

    function test_Refund_RevertsUnknownPayroll() public {
        vm.prank(fin);
        vm.expectRevert(abi.encodeWithSelector(ZalaryPayrollVault.PayrollNotFound.selector, id1));
        vault.refundLeftover(id1, alice);
    }

    function test_Refund_RevertsDraftPayroll() public {
        _draftSimple(id1);
        _expire(id1);
        vm.prank(fin);
        vm.expectRevert(
            abi.encodeWithSelector(
                ZalaryPayrollVault.InvalidPayrollStatus.selector, id1, ZalaryPayrollVault.PayrollStatus.DRAFT
            )
        );
        vault.refundLeftover(id1, alice);
    }

    function test_Refund_RevertsNonEmployee() public {
        _fundedSimple(id1);
        _expire(id1);
        vm.prank(fin);
        vm.expectRevert(abi.encodeWithSelector(ZalaryPayrollVault.AllocationNotFound.selector, id1, rando));
        vault.refundLeftover(id1, rando);
    }

    function test_Refund_CannotRefundAlreadyClaimedAllocation() public {
        _fundedSimple(id1);
        vm.prank(alice);
        vault.claimPayrollSalary(id1);
        _expire(id1);
        vm.prank(fin);
        vm.expectRevert(abi.encodeWithSelector(ZalaryPayrollVault.AlreadyClaimed.selector, id1, alice));
        vault.refundLeftover(id1, alice);
        // alice keeps her salary, vault still holds bob's
        assertEq(usdc.balanceOf(alice), A_AMT);
        assertEq(usdc.balanceOf(address(vault)), B_AMT);
    }

    function test_Refund_CannotRefundTwice() public {
        _fundedSimple(id1);
        _expire(id1);
        vm.startPrank(fin);
        vault.refundLeftover(id1, alice);
        vm.expectRevert(abi.encodeWithSelector(ZalaryPayrollVault.AlreadyRefunded.selector, id1, alice));
        vault.refundLeftover(id1, alice);
        vm.stopPrank();
        assertEq(usdc.balanceOf(fin), A_AMT);
    }

    function test_Refund_SucceedsWhenPaused() public {
        _fundedSimple(id1);
        _expire(id1);
        vm.prank(admin);
        vault.pause();
        vm.prank(fin);
        vm.expectEmit(true, true, true, true, address(vault));
        emit ZalaryPayrollVault.LeftoverRefunded(id1, fin, alice, A_AMT);
        vault.refundLeftover(id1, alice);
        assertEq(usdc.balanceOf(fin), A_AMT);
        assertEq(vault.totalEscrowed(), B_AMT);
        assertEq(vault.getClaimableBalance(alice), 0);
        assertTrue(vault.paused());
    }

    function test_Refund_PausedStillRequiresFinanceAndExpiry() public {
        _fundedSimple(id1);
        vm.prank(admin);
        vault.pause();
        uint64 dl = _deadline(id1);
        vm.prank(fin);
        vm.expectRevert(abi.encodeWithSelector(ZalaryPayrollVault.PayrollNotExpired.selector, id1, dl));
        vault.refundLeftover(id1, alice);
        _expire(id1);
        vm.prank(rando);
        vm.expectRevert(ZalaryPayrollVault.NotFinance.selector);
        vault.refundLeftover(id1, alice);
    }

    // ----------------------------------------------- claims blocked after refund

    function test_Refund_BlocksPayrollClaim_PartialPayroll() public {
        _fundedSimple(id1);
        _expire(id1);
        vm.prank(fin);
        vault.refundLeftover(id1, alice);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ZalaryPayrollVault.AlreadyRefunded.selector, id1, alice));
        vault.claimPayrollSalary(id1);
    }

    function test_Refund_BlocksAggregateAndRelayerClaim() public {
        _fundedSingle(id1, alice, 100e6);
        _expire(id1);
        vm.prank(fin);
        vault.refundLeftover(id1, alice);

        vm.prank(alice);
        vm.expectRevert(ZalaryPayrollVault.NoClaimableBalance.selector);
        vault.claimSalary();
        vm.prank(relayer);
        vm.expectRevert(ZalaryPayrollVault.NoClaimableBalance.selector);
        vault.claimSalaryFor(alice);
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                ZalaryPayrollVault.InvalidPayrollStatus.selector, id1, ZalaryPayrollVault.PayrollStatus.REFUNDED
            )
        );
        vault.claimPayrollSalary(id1);
        assertEq(usdc.balanceOf(alice), 0);
    }

    function test_Refund_OtherEmployeesCanStillClaimAfterPartialRefund() public {
        _fundedSimple(id1);
        _expire(id1);
        vm.prank(fin);
        vault.refundLeftover(id1, alice);
        vm.prank(bob);
        vault.claimSalary();
        assertEq(usdc.balanceOf(bob), B_AMT);
    }

    // ----------------------------------------------------- status transitions

    function test_Status_AllRefunded_IsRefunded() public {
        _fundedSimple(id1);
        _expire(id1);
        vm.startPrank(fin);
        vault.refundLeftover(id1, alice);
        vault.refundLeftover(id1, bob);
        vm.stopPrank();
        assertEq(uint8(_status(id1)), uint8(ZalaryPayrollVault.PayrollStatus.REFUNDED));
        assertEq(vault.totalEscrowed(), 0);
        assertEq(usdc.balanceOf(address(vault)), 0);
        assertEq(usdc.balanceOf(fin), SIMPLE_TOTAL);
        assertEq(vault.getPayroll(id1).remainingEscrow, 0);
    }

    function test_Status_ClaimedThenLastRefunded_IsRefunded() public {
        _fundedSimple(id1);
        vm.prank(alice);
        vault.claimPayrollSalary(id1);
        _expire(id1);
        vm.prank(fin);
        vault.refundLeftover(id1, bob);
        assertEq(uint8(_status(id1)), uint8(ZalaryPayrollVault.PayrollStatus.REFUNDED));
        assertEq(usdc.balanceOf(fin), B_AMT);
    }

    function test_Status_RefundedThenLastClaimed_IsCompleted() public {
        _fundedSimple(id1);
        _expire(id1);
        vm.prank(fin);
        vault.refundLeftover(id1, alice);
        vm.prank(bob);
        vault.claimPayrollSalary(id1);
        assertEq(uint8(_status(id1)), uint8(ZalaryPayrollVault.PayrollStatus.COMPLETED));
        assertEq(vault.totalEscrowed(), 0);
    }

    function test_Refund_AfterRefundedStatusRevertsInvalidStatus() public {
        _fundedSingle(id1, alice, 10e6);
        _expire(id1);
        vm.startPrank(fin);
        vault.refundLeftover(id1, alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                ZalaryPayrollVault.InvalidPayrollStatus.selector, id1, ZalaryPayrollVault.PayrollStatus.REFUNDED
            )
        );
        vault.refundLeftover(id1, alice);
        vm.stopPrank();
    }

    function test_Refund_DirectFundedGoesToDualRoleWallet() public {
        (address[] memory e, uint256[] memory m) = _arr(alice, 100e6);
        (, uint256 charge) = vault.calculateFee(100e6);
        usdc.mint(dual, charge);
        vm.startPrank(dual);
        usdc.approve(address(vault), charge);
        vault.fundPayrollDirect(id1, uint64(block.timestamp + WEEK), e, m, 100e6);
        vm.stopPrank();
        _expire(id1);
        vm.prank(fin);
        vault.refundLeftover(id1, alice);
        assertEq(usdc.balanceOf(dual), 100e6);
        assertEq(usdc.balanceOf(fin), 0);
    }

    function test_Refund_FeeIsNotRefunded() public {
        _fundedSingle(id1, alice, 100e6);
        _expire(id1);
        vm.prank(fin);
        vault.refundLeftover(id1, alice);
        assertEq(usdc.balanceOf(fin), 100e6); // salary only
        assertEq(usdc.balanceOf(feeRec), 1e6); // fee kept by recipient
    }
}
