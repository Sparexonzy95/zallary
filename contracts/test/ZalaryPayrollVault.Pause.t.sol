// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {ZalaryPayrollVaultTestBase} from "./ZalaryPayrollVault.Base.t.sol";
import {ZalaryPayrollVault} from "../ZalaryPayrollVault.sol";

/// @dev Pause semantics: pause blocks only create/fund/fundDirect; pause authority = admin OR PAUSER_ROLE.
contract ZalaryPayrollVaultPauseTest is ZalaryPayrollVaultTestBase {
    bytes32 internal id1 = _id(1);
    bytes32 internal id2 = _id(2);
    address internal newAdmin = makeAddr("newAdmin");

    function _unauth(address who) internal view returns (bytes memory) {
        return abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, who, PAUSER);
    }

    function _pause() internal {
        vm.prank(admin);
        vault.pause();
    }

    function _grantPauser() internal {
        vm.prank(admin);
        vault.grantRole(PAUSER, pauser);
    }

    function _handover() internal {
        vm.prank(admin);
        vault.beginDefaultAdminTransfer(newAdmin);
        skip(uint256(ADMIN_DELAY) + 1);
        vm.prank(newAdmin);
        vault.acceptDefaultAdminTransfer();
    }

    // ------------------------------------------------- claims/refunds while paused

    function test_Paused_ClaimSalaryClaimSalaryForClaimPayrollAllSucceed() public {
        _fundedSimple(id1); // alice 1000, bob 2000
        _fundedSingle(id2, carol, 500e6);
        _pause();

        vm.prank(alice);
        vault.claimSalary();
        assertEq(usdc.balanceOf(alice), A_AMT);

        vm.prank(relayer);
        vault.claimSalaryFor(bob);
        assertEq(usdc.balanceOf(bob), B_AMT);

        vm.prank(carol);
        vault.claimPayrollSalary(id2);
        assertEq(usdc.balanceOf(carol), 500e6);

        assertEq(vault.totalEscrowed(), 0);
        assertTrue(vault.paused());
        assertEq(uint8(_status(id1)), uint8(ZalaryPayrollVault.PayrollStatus.COMPLETED));
        assertEq(uint8(_status(id2)), uint8(ZalaryPayrollVault.PayrollStatus.COMPLETED));
    }

    function test_Paused_ClaimAfterExpiryStillSucceeds() public {
        _fundedSingle(id1, alice, 100e6);
        _expire(id1);
        _pause();
        vm.prank(alice);
        vault.claimSalary();
        assertEq(usdc.balanceOf(alice), 100e6);
    }

    function test_Paused_RefundLeftoverSucceeds() public {
        _fundedSimple(id1);
        _expire(id1);
        _pause();
        vm.prank(fin);
        vault.refundLeftover(id1, alice);
        assertEq(usdc.balanceOf(fin), A_AMT);
        // bob can still claim his remaining escrow while paused
        vm.prank(bob);
        vault.claimPayrollSalary(id1);
        assertEq(usdc.balanceOf(bob), B_AMT);
        assertEq(vault.totalEscrowed(), 0);
    }

    function test_Paused_CancelDraftAndRescueStillWork() public {
        _draftSimple(id1);
        _fundedSingle(id2, alice, 10e6);
        usdc.mint(address(vault), 7e6); // surplus
        _pause();

        vm.prank(hr);
        vault.cancelPayrollDraft(id1);
        assertEq(uint8(_status(id1)), uint8(ZalaryPayrollVault.PayrollStatus.CANCELLED));

        vm.prank(admin);
        vault.rescueToken(address(usdc), rando, 7e6);
        assertEq(usdc.balanceOf(rando), 7e6);
    }

    function test_Paused_StillBlocksCreateFundAndDirect() public {
        _draftSimple(id1);
        _pause();
        (address[] memory e, uint256[] memory m) = _arr(bob, 5e6);
        uint64 dl = uint64(block.timestamp + WEEK);

        vm.prank(hr);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vault.createPayrollDraft(id2, dl, e, m, 5e6);
        vm.prank(fin);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vault.fundPayroll(id1);
        vm.prank(dual);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vault.fundPayrollDirect(id2, dl, e, m, 5e6);
    }

    function test_Unpause_RestoresCreateAndFunding() public {
        _draftSimple(id1);
        _pause();
        vm.prank(admin);
        vault.unpause();
        _fund(id1);
        assertEq(uint8(_status(id1)), uint8(ZalaryPayrollVault.PayrollStatus.FUNDED));
        _draftSimple(id2);
        assertEq(vault.payrollCount(), 2);
    }

    // ------------------------------------------------------------ authority

    function test_Admin_CanPauseAndUnpauseWithoutPauserRole() public {
        assertFalse(vault.hasRole(PAUSER, admin));
        vm.expectEmit(false, false, false, true, address(vault));
        emit Pausable.Paused(admin);
        vm.prank(admin);
        vault.pause();
        assertTrue(vault.paused());

        vm.expectEmit(false, false, false, true, address(vault));
        emit Pausable.Unpaused(admin);
        vm.prank(admin);
        vault.unpause();
        assertFalse(vault.paused());
    }

    function test_PauserHolder_CanPauseAndUnpause() public {
        _grantPauser();
        vm.prank(pauser);
        vault.pause();
        assertTrue(vault.paused());
        vm.prank(pauser);
        vault.unpause();
        assertFalse(vault.paused());
    }

    function test_PauserHolder_HasNoAdminPowers() public {
        _grantPauser();
        vm.prank(pauser);
        vm.expectRevert(abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, pauser, ADMIN_ROLE));
        vault.setProtocolFee(0, feeRec);
        vm.prank(pauser);
        vm.expectRevert(abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, pauser, ADMIN_ROLE));
        vault.grantRole(HR, pauser);
    }

    function test_RandomAccounts_CannotPauseOrUnpause() public {
        address[6] memory outsiders = [rando, hr, fin, dual, relayer, alice];
        for (uint256 i; i < outsiders.length; ++i) {
            vm.prank(outsiders[i]);
            vm.expectRevert(_unauth(outsiders[i]));
            vault.pause();
        }
        assertFalse(vault.paused());

        _pause();
        for (uint256 i; i < outsiders.length; ++i) {
            vm.prank(outsiders[i]);
            vm.expectRevert(_unauth(outsiders[i]));
            vault.unpause();
        }
        assertTrue(vault.paused());
    }

    function testFuzz_NonAuthorizedCannotPause(address who) public {
        vm.assume(who != admin);
        vm.prank(who);
        vm.expectRevert(_unauth(who));
        vault.pause();
        assertFalse(vault.paused());
    }

    function test_PauseTwice_And_UnpauseWhenNotPaused_Revert() public {
        vm.prank(admin);
        vm.expectRevert(Pausable.ExpectedPause.selector);
        vault.unpause();
        _pause();
        vm.prank(admin);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vault.pause();
    }

    function test_RevokedPauser_LosesPauseAuthority() public {
        _grantPauser();
        vm.prank(admin);
        vault.revokeRole(PAUSER, pauser);
        vm.prank(pauser);
        vm.expectRevert(_unauth(pauser));
        vault.pause();
    }

    // -------------------------------------------------------- admin handover

    function test_Handover_OldAdminCannotPauseOrUnpause_NewAdminCan() public {
        _handover();
        assertEq(vault.defaultAdmin(), newAdmin);

        vm.prank(admin);
        vm.expectRevert(_unauth(admin));
        vault.pause();

        vm.prank(newAdmin);
        vault.pause();
        assertTrue(vault.paused());

        vm.prank(admin);
        vm.expectRevert(_unauth(admin));
        vault.unpause();
        assertTrue(vault.paused());

        vm.prank(newAdmin);
        vault.unpause();
        assertFalse(vault.paused());
    }

    function test_Handover_OldAdminKeepsPauseUntilAcceptance() public {
        vm.prank(admin);
        vault.beginDefaultAdminTransfer(newAdmin);
        skip(uint256(ADMIN_DELAY) + 1);
        // transfer scheduled and delay elapsed but not yet accepted: old admin still is admin
        vm.prank(admin);
        vault.pause();
        vm.prank(newAdmin);
        vm.expectRevert(_unauth(newAdmin));
        vault.unpause();
        vm.prank(newAdmin);
        vault.acceptDefaultAdminTransfer();
        vm.prank(newAdmin);
        vault.unpause();
        assertFalse(vault.paused());
    }

    function test_Handover_OldAdminCannotUnpauseVaultPausedBeforeHandover() public {
        _pause();
        _handover();
        vm.prank(admin);
        vm.expectRevert(_unauth(admin));
        vault.unpause();
        vm.prank(newAdmin);
        vault.unpause();
        assertFalse(vault.paused());
    }

    function test_Handover_ExplicitPauserRoleSurvives() public {
        _grantPauser();
        _handover();
        assertTrue(vault.hasRole(PAUSER, pauser));
        vm.prank(pauser);
        vault.pause();
        assertTrue(vault.paused());
        vm.prank(pauser);
        vault.unpause();
        assertFalse(vault.paused());
    }

    function test_Handover_OldAdminWithExplicitPauserRoleKeepsPauseButNotAdmin() public {
        vm.prank(admin);
        vault.grantRole(PAUSER, admin);
        _handover();
        assertTrue(vault.hasRole(PAUSER, admin));
        assertFalse(vault.hasRole(ADMIN_ROLE, admin));
        vm.prank(admin);
        vault.pause();
        assertTrue(vault.paused());
        // but no admin powers
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, admin, ADMIN_ROLE));
        vault.setProtocolFee(0, feeRec);
    }

    function test_Handover_NewAdminCanGrantAndRevokePauser() public {
        _handover();
        vm.prank(newAdmin);
        vault.grantRole(PAUSER, pauser);
        vm.prank(pauser);
        vault.pause();
        vm.prank(newAdmin);
        vault.revokeRole(PAUSER, pauser);
        vm.prank(pauser);
        vm.expectRevert(_unauth(pauser));
        vault.unpause();
    }

    function test_Handover_EmployeesStillClaimWhilePausedByNewAdmin() public {
        _fundedSimple(id1);
        _handover();
        vm.prank(newAdmin);
        vault.pause();
        vm.prank(alice);
        vault.claimSalary();
        assertEq(usdc.balanceOf(alice), A_AMT);
    }

    // ------------------------------------------------------ separate approver

    function test_SeparateApprover_On_FundPayrollRevertsForCreatorEvenUnpaused() public {
        vm.prank(admin);
        vault.setRequireSeparateApprover(true);
        (address[] memory e, uint256[] memory m) = _arr(alice, 10e6);
        _draftAs(dual, id1, e, m);
        (, uint256 charge) = vault.calculateFee(10e6);
        usdc.mint(dual, charge);
        vm.startPrank(dual);
        usdc.approve(address(vault), charge);
        vm.expectRevert(ZalaryPayrollVault.SelfApprovalNotAllowed.selector);
        vault.fundPayroll(id1);
        vm.stopPrank();
        // a different finance account still can
        _fundAs(fin, id1);
        assertEq(uint8(_status(id1)), uint8(ZalaryPayrollVault.PayrollStatus.FUNDED));
    }

    function test_SeparateApprover_On_FundPayrollDirectRevertsSelfApproval() public {
        vm.prank(admin);
        vault.setRequireSeparateApprover(true);
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

    function test_SeparateApprover_Off_FundPayrollDirectWorksForDual() public {
        (address[] memory e, uint256[] memory m) = _arr(alice, 10e6);
        (, uint256 charge) = vault.calculateFee(10e6);
        usdc.mint(dual, charge);
        vm.startPrank(dual);
        usdc.approve(address(vault), charge);
        vault.fundPayrollDirect(id1, uint64(block.timestamp + WEEK), e, m, 10e6);
        vm.stopPrank();
        assertEq(uint8(_status(id1)), uint8(ZalaryPayrollVault.PayrollStatus.FUNDED));
        assertEq(vault.getPayroll(id1).employer, dual);
    }

    // ------------------------------------------------------------------ fuzz

    /// A paused vault never blocks an employee from withdrawing escrow, via any claim path.
    function testFuzz_PausedVaultNeverBlocksEmployeeWithdrawal(
        uint256 a, uint256 b, uint8 path, bool byPauser, bool expired
    ) public {
        a = bound(a, 1, 1e12 * 1e6);
        b = bound(b, 1, 1e12 * 1e6);
        (address[] memory e, uint256[] memory m) = _arr2(alice, a, bob, b);
        _draft(id1, e, m);
        _fund(id1);
        if (expired) _expire(id1);

        _grantPauser();
        vm.prank(byPauser ? pauser : admin);
        vault.pause();

        path = uint8(bound(path, 0, 2));
        if (path == 0) {
            vm.prank(alice);
            vault.claimSalary();
        } else if (path == 1) {
            vm.prank(relayer);
            vault.claimSalaryFor(alice);
        } else {
            vm.prank(alice);
            vault.claimPayrollSalary(id1);
        }
        assertEq(usdc.balanceOf(alice), a);
        assertEq(vault.getClaimableBalance(alice), 0);
        assertEq(vault.totalEscrowed(), b);
        assertGe(usdc.balanceOf(address(vault)), vault.totalEscrowed());

        // the other employee can still drain the rest
        vm.prank(bob);
        vault.claimSalary();
        assertEq(usdc.balanceOf(bob), b);
        assertEq(vault.totalEscrowed(), 0);
        assertTrue(vault.paused());
    }

    /// Pause toggling between operations never changes settlement outcomes or conservation.
    function testFuzz_PauseToggling_PreservesConservation(uint256 a, uint256 b, uint8 pattern) public {
        a = bound(a, 1, 1e12 * 1e6);
        b = bound(b, 1, 1e12 * 1e6);
        (address[] memory e, uint256[] memory m) = _arr2(alice, a, bob, b);
        _draft(id1, e, m);
        if (pattern & 1 != 0) _pause();
        if (pattern & 1 != 0) {
            vm.prank(admin);
            vault.unpause();
        }
        _fund(id1);
        if (pattern & 2 != 0) _pause();
        vm.prank(alice);
        vault.claimSalary();
        assertEq(vault.totalEscrowed(), b);
        assertEq(usdc.balanceOf(address(vault)), b);
        _expire(id1);
        vm.prank(fin);
        vault.refundLeftover(id1, bob);
        assertEq(usdc.balanceOf(fin), b);
        assertEq(vault.totalEscrowed(), 0);
        assertEq(usdc.balanceOf(address(vault)), 0);
    }
}
