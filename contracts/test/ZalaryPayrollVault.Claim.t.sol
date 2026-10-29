// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Vm} from "forge-std/Vm.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ZalaryPayrollVaultTestBase} from "./ZalaryPayrollVault.Base.t.sol";
import {ZalaryPayrollVault} from "../ZalaryPayrollVault.sol";

contract ZalaryPayrollVaultClaimTest is ZalaryPayrollVaultTestBase {
    bytes32 internal id1 = _id(1);
    bytes32 internal id2 = _id(2);
    bytes32 internal id3 = _id(3);

    // ------------------------------------------------------ claimPayrollSalary

    function test_ClaimPayroll_PaysEmployeeAndUpdatesState() public {
        _fundedSimple(id1);
        vm.prank(alice);
        vm.expectEmit(true, true, true, true, address(vault));
        emit ZalaryPayrollVault.PayrollSalaryClaimed(id1, alice, A_AMT, alice);
        vm.expectEmit(true, true, false, true, address(vault));
        emit ZalaryPayrollVault.SalaryClaimed(alice, A_AMT, alice);
        vault.claimPayrollSalary(id1);

        assertEq(usdc.balanceOf(alice), A_AMT);
        assertEq(usdc.balanceOf(address(vault)), B_AMT);
        assertEq(vault.totalEscrowed(), B_AMT);
        assertEq(vault.getPayroll(id1).remainingEscrow, B_AMT);
        assertEq(vault.getClaimableBalance(alice), 0);
        assertEq(vault.totalClaimed(alice), A_AMT);
        assertEq(vault.openPayrollCount(alice), 0);
        assertTrue(vault.getAllocation(id1, alice).claimed);
        // partial: still FUNDED
        assertEq(uint8(_status(id1)), uint8(ZalaryPayrollVault.PayrollStatus.FUNDED));
    }

    function test_ClaimPayroll_StatusCompletedWhenAllClaimed() public {
        _fundedSimple(id1);
        vm.prank(alice);
        vault.claimPayrollSalary(id1);
        vm.prank(bob);
        vault.claimPayrollSalary(id1);
        assertEq(uint8(_status(id1)), uint8(ZalaryPayrollVault.PayrollStatus.COMPLETED));
        assertEq(vault.getPayroll(id1).remainingEscrow, 0);
        assertEq(vault.totalEscrowed(), 0);
        assertEq(usdc.balanceOf(address(vault)), 0);
    }

    function test_ClaimPayroll_StillWorksAfterDeadline() public {
        _fundedSimple(id1);
        _expire(id1);
        vm.prank(alice);
        vault.claimPayrollSalary(id1);
        assertEq(usdc.balanceOf(alice), A_AMT);
    }

    function test_ClaimPayroll_RevertsDraft() public {
        _draftSimple(id1);
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                ZalaryPayrollVault.InvalidPayrollStatus.selector, id1, ZalaryPayrollVault.PayrollStatus.DRAFT
            )
        );
        vault.claimPayrollSalary(id1);
    }

    function test_ClaimPayroll_RevertsUnknownPayroll() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ZalaryPayrollVault.PayrollNotFound.selector, id1));
        vault.claimPayrollSalary(id1);
    }

    function test_ClaimPayroll_RevertsNonEmployee() public {
        _fundedSimple(id1);
        vm.prank(rando);
        vm.expectRevert(abi.encodeWithSelector(ZalaryPayrollVault.AllocationNotFound.selector, id1, rando));
        vault.claimPayrollSalary(id1);
    }

    function test_ClaimPayroll_RevertsDoubleClaim() public {
        _fundedSimple(id1);
        vm.startPrank(alice);
        vault.claimPayrollSalary(id1);
        vm.expectRevert(abi.encodeWithSelector(ZalaryPayrollVault.AlreadyClaimed.selector, id1, alice));
        vault.claimPayrollSalary(id1);
        vm.stopPrank();
    }

    function test_ClaimPayroll_RevertsAfterCompleted() public {
        _fundedSingle(id1, alice, 10e6);
        vm.startPrank(alice);
        vault.claimPayrollSalary(id1);
        vm.expectRevert(
            abi.encodeWithSelector(
                ZalaryPayrollVault.InvalidPayrollStatus.selector, id1, ZalaryPayrollVault.PayrollStatus.COMPLETED
            )
        );
        vault.claimPayrollSalary(id1);
        vm.stopPrank();
    }

    function test_ClaimPayroll_RevertsWhenPaused() public {
        _fundedSimple(id1);
        vm.prank(admin);
        vault.pause();
        vm.prank(alice);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vault.claimPayrollSalary(id1);
    }

    // ------------------------------------------------------------ claimSalary

    function test_ClaimSalary_AggregatesAcrossPayrolls() public {
        _fundedSingle(id1, alice, 100e6);
        _fundedSingle(id2, alice, 200e6);
        _fundedSingle(id3, alice, 300e6);
        assertEq(vault.openPayrollCount(alice), 3);
        assertEq(vault.getClaimableBalance(alice), 600e6);

        vm.prank(alice);
        vm.expectEmit(true, true, false, true, address(vault));
        emit ZalaryPayrollVault.SalaryClaimed(alice, 600e6, alice);
        vault.claimSalary();

        assertEq(usdc.balanceOf(alice), 600e6);
        assertEq(vault.getClaimableBalance(alice), 0);
        assertEq(vault.totalClaimed(alice), 600e6);
        assertEq(vault.openPayrollCount(alice), 0);
        assertEq(vault.totalEscrowed(), 0);
        assertEq(uint8(_status(id1)), uint8(ZalaryPayrollVault.PayrollStatus.COMPLETED));
        assertEq(uint8(_status(id2)), uint8(ZalaryPayrollVault.PayrollStatus.COMPLETED));
        assertEq(uint8(_status(id3)), uint8(ZalaryPayrollVault.PayrollStatus.COMPLETED));
    }

    function test_ClaimSalary_EmitsPerPayrollEvents() public {
        _fundedSingle(id1, alice, 100e6);
        _fundedSingle(id2, alice, 200e6);
        vm.recordLogs();
        vm.prank(alice);
        vault.claimSalary();
        Vm.Log[] memory logs = vm.getRecordedLogs();
        uint256 perPayroll;
        uint256 aggregate;
        for (uint256 i; i < logs.length; ++i) {
            if (logs[i].emitter != address(vault)) continue;
            if (logs[i].topics[0] == ZalaryPayrollVault.PayrollSalaryClaimed.selector) ++perPayroll;
            if (logs[i].topics[0] == ZalaryPayrollVault.SalaryClaimed.selector) ++aggregate;
        }
        assertEq(perPayroll, 2);
        assertEq(aggregate, 1);
    }

    function test_ClaimSalary_RevertsWhenNothingClaimable() public {
        vm.prank(alice);
        vm.expectRevert(ZalaryPayrollVault.NoClaimableBalance.selector);
        vault.claimSalary();
    }

    function test_ClaimSalary_RevertsOnDraftOnly() public {
        _draftSimple(id1);
        vm.prank(alice);
        vm.expectRevert(ZalaryPayrollVault.NoClaimableBalance.selector);
        vault.claimSalary();
    }

    function test_ClaimSalary_RevertsWhenPaused() public {
        _fundedSimple(id1);
        vm.prank(admin);
        vault.pause();
        vm.prank(alice);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vault.claimSalary();
    }

    function test_ClaimSalary_BatchCapRequiresSecondCall() public {
        uint256 n = 60;
        for (uint256 i; i < n; ++i) {
            _fundedSingle(_id(100 + i), alice, 10e6);
        }
        assertEq(vault.openPayrollCount(alice), n);
        assertEq(vault.getClaimableBalance(alice), n * 10e6);

        vm.prank(alice);
        vault.claimSalary();
        // exactly MAX_CLAIM_BATCH settled
        assertEq(usdc.balanceOf(alice), 50 * 10e6);
        assertEq(vault.openPayrollCount(alice), 10);
        assertEq(vault.getClaimableBalance(alice), 10 * 10e6);
        assertEq(vault.totalEscrowed(), 10 * 10e6);
        uint256 completed;
        for (uint256 i; i < n; ++i) {
            if (_status(_id(100 + i)) == ZalaryPayrollVault.PayrollStatus.COMPLETED) ++completed;
        }
        assertEq(completed, 50);

        vm.prank(alice);
        vault.claimSalary();
        assertEq(usdc.balanceOf(alice), n * 10e6);
        assertEq(vault.openPayrollCount(alice), 0);
        assertEq(vault.totalEscrowed(), 0);
        assertEq(usdc.balanceOf(address(vault)), 0);
        assertEq(vault.totalClaimed(alice), n * 10e6);

        vm.prank(alice);
        vm.expectRevert(ZalaryPayrollVault.NoClaimableBalance.selector);
        vault.claimSalary();
    }

    function test_ClaimSalary_ExactlyBatchSizeInOneCall() public {
        for (uint256 i; i < 50; ++i) {
            _fundedSingle(_id(100 + i), alice, 1e6);
        }
        vm.prank(alice);
        vault.claimSalary();
        assertEq(usdc.balanceOf(alice), 50e6);
        assertEq(vault.openPayrollCount(alice), 0);
    }

    // ----------------------------------------------------------- claimSalaryFor

    function test_ClaimFor_EmployeeSelf() public {
        _fundedSimple(id1);
        vm.prank(alice);
        vault.claimSalaryFor(alice);
        assertEq(usdc.balanceOf(alice), A_AMT);
    }

    function test_ClaimFor_RelayerPaysEmployeeNotRelayer() public {
        _fundedSimple(id1);
        vm.prank(relayer);
        vm.expectEmit(true, true, true, true, address(vault));
        emit ZalaryPayrollVault.PayrollSalaryClaimed(id1, alice, A_AMT, relayer);
        vm.expectEmit(true, true, false, true, address(vault));
        emit ZalaryPayrollVault.SalaryClaimed(alice, A_AMT, relayer);
        vault.claimSalaryFor(alice);

        assertEq(usdc.balanceOf(alice), A_AMT, "funds go to employee");
        assertEq(usdc.balanceOf(relayer), 0, "relayer receives nothing");
        assertEq(vault.totalClaimed(alice), A_AMT);
        assertEq(vault.getClaimableBalance(alice), 0);
    }

    function test_ClaimFor_RevertsForUnrelatedCaller() public {
        _fundedSimple(id1);
        vm.prank(rando);
        vm.expectRevert(ZalaryPayrollVault.NotEmployeeOrRelayer.selector);
        vault.claimSalaryFor(alice);
    }

    function test_ClaimFor_AdminWithoutRelayerRoleReverts() public {
        _fundedSimple(id1);
        vm.prank(admin);
        vm.expectRevert(ZalaryPayrollVault.NotEmployeeOrRelayer.selector);
        vault.claimSalaryFor(alice);
    }

    function test_ClaimFor_OtherEmployeeCannotClaimForPeer() public {
        _fundedSimple(id1);
        vm.prank(bob);
        vm.expectRevert(ZalaryPayrollVault.NotEmployeeOrRelayer.selector);
        vault.claimSalaryFor(alice);
    }

    function test_ClaimFor_RevertsZeroAddress() public {
        vm.prank(relayer);
        vm.expectRevert(ZalaryPayrollVault.ZeroAddress.selector);
        vault.claimSalaryFor(address(0));
    }

    function test_ClaimFor_RelayerWithNothingToClaimReverts() public {
        vm.prank(relayer);
        vm.expectRevert(ZalaryPayrollVault.NoClaimableBalance.selector);
        vault.claimSalaryFor(carol);
    }

    function test_ClaimFor_RelayerRoleRevokedLosesAccess() public {
        _fundedSimple(id1);
        vm.prank(admin);
        vault.revokeRole(RELAYER, relayer);
        vm.prank(relayer);
        vm.expectRevert(ZalaryPayrollVault.NotEmployeeOrRelayer.selector);
        vault.claimSalaryFor(alice);
    }

    function test_ClaimFor_RespectsBatchCap() public {
        for (uint256 i; i < 55; ++i) {
            _fundedSingle(_id(100 + i), alice, 1e6);
        }
        vm.prank(relayer);
        vault.claimSalaryFor(alice);
        assertEq(usdc.balanceOf(alice), 50e6);
        assertEq(vault.openPayrollCount(alice), 5);
    }

    function test_ClaimFor_RevertsWhenPaused() public {
        _fundedSimple(id1);
        vm.prank(admin);
        vault.pause();
        vm.prank(relayer);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vault.claimSalaryFor(alice);
    }

    // ------------------------------------------------------ no double payment

    function test_NoDoublePay_ClaimSalaryThenClaimPayroll() public {
        _fundedSingle(id1, alice, 100e6);
        _fundedSingle(id2, alice, 200e6);
        vm.startPrank(alice);
        vault.claimSalary();
        // payroll fully settled -> COMPLETED
        vm.expectRevert(
            abi.encodeWithSelector(
                ZalaryPayrollVault.InvalidPayrollStatus.selector, id1, ZalaryPayrollVault.PayrollStatus.COMPLETED
            )
        );
        vault.claimPayrollSalary(id1);
        vm.stopPrank();
        assertEq(usdc.balanceOf(alice), 300e6);
    }

    function test_NoDoublePay_ClaimSalaryThenClaimPayroll_SharedPayroll() public {
        _fundedSimple(id1); // alice + bob share payroll; stays FUNDED after alice claims
        vm.startPrank(alice);
        vault.claimSalary();
        vm.expectRevert(abi.encodeWithSelector(ZalaryPayrollVault.AlreadyClaimed.selector, id1, alice));
        vault.claimPayrollSalary(id1);
        vm.stopPrank();
        assertEq(usdc.balanceOf(alice), A_AMT);
        assertEq(vault.totalEscrowed(), B_AMT);
    }

    function test_NoDoublePay_ClaimPayrollThenClaimSalary() public {
        _fundedSingle(id1, alice, 100e6);
        _fundedSingle(id2, alice, 200e6);
        vm.startPrank(alice);
        vault.claimPayrollSalary(id1);
        assertEq(vault.getClaimableBalance(alice), 200e6);
        vault.claimSalary(); // only id2 remains
        vm.expectRevert(ZalaryPayrollVault.NoClaimableBalance.selector);
        vault.claimSalary();
        vm.stopPrank();
        assertEq(usdc.balanceOf(alice), 300e6);
        assertEq(vault.totalClaimed(alice), 300e6);
        assertEq(vault.totalEscrowed(), 0);
        assertEq(usdc.balanceOf(address(vault)), 0);
    }

    function test_NoDoublePay_ClaimPayrollThenClaimSalary_SharedPayroll() public {
        _fundedSimple(id1);
        vm.startPrank(alice);
        vault.claimPayrollSalary(id1);
        vm.expectRevert(ZalaryPayrollVault.NoClaimableBalance.selector);
        vault.claimSalary();
        vm.stopPrank();
        assertEq(usdc.balanceOf(alice), A_AMT);
    }

    function test_NoDoublePay_RelayerThenSelf() public {
        _fundedSimple(id1);
        vm.prank(relayer);
        vault.claimSalaryFor(alice);
        vm.startPrank(alice);
        vm.expectRevert(ZalaryPayrollVault.NoClaimableBalance.selector);
        vault.claimSalary();
        vm.expectRevert(abi.encodeWithSelector(ZalaryPayrollVault.AlreadyClaimed.selector, id1, alice));
        vault.claimPayrollSalary(id1);
        vm.stopPrank();
        assertEq(usdc.balanceOf(alice), A_AMT);
    }
}
