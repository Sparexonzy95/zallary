// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {IAccessControlDefaultAdminRules} from
    "@openzeppelin/contracts/access/extensions/IAccessControlDefaultAdminRules.sol";
import {ZalaryPayrollVaultTestBase} from "./ZalaryPayrollVault.Base.t.sol";
import {ZalaryPayrollVault} from "../ZalaryPayrollVault.sol";
import {MockERC20} from "../test-helpers/MockERC20.sol";

contract ZalaryPayrollVaultAdminTest is ZalaryPayrollVaultTestBase {
    bytes32 internal id1 = _id(1);
    address internal newAdmin = makeAddr("newAdmin");
    address internal sink = makeAddr("sink");

    function _unauth(address who, bytes32 role) internal pure returns (bytes memory) {
        return abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, who, role);
    }

    // ------------------------------------------------------------------ pause

    function test_Pause_OnlyPauserOrAdmin() public {
        vm.prank(hr);
        vm.expectRevert(_unauth(hr, PAUSER));
        vault.pause();
        vm.prank(admin);
        vault.pause();
        assertTrue(vault.paused());

        vm.prank(rando);
        vm.expectRevert(_unauth(rando, PAUSER));
        vault.unpause();
        vm.prank(admin);
        vault.unpause();
        assertFalse(vault.paused());
    }

    function test_Pause_GrantedPauserCanPause() public {
        vm.prank(admin);
        vault.grantRole(PAUSER, rando);
        vm.prank(rando);
        vault.pause();
        assertTrue(vault.paused());
    }

    function test_Pause_BlocksOnlyCreateAndFunding() public {
        _fundedSingle(id1, alice, 10e6);
        _draftSimple(_id(3)); // pre-existing draft for the fundPayroll path
        vm.prank(admin);
        vault.pause();

        (address[] memory e, uint256[] memory m) = _arr(bob, 5e6);
        uint64 dl = uint64(block.timestamp + WEEK);

        vm.prank(hr);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vault.createPayrollDraft(_id(2), dl, e, m, 5e6);
        vm.prank(fin);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vault.fundPayroll(_id(3));
        vm.prank(dual);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vault.fundPayrollDirect(_id(2), dl, e, m, 5e6);
        // employee withdrawal path stays open
        vm.prank(alice);
        vault.claimSalary();
        assertEq(usdc.balanceOf(alice), 10e6);
    }

    function test_Pause_UnpauseRestoresOperations() public {
        _fundedSingle(id1, alice, 10e6);
        vm.prank(admin);
        vault.pause();
        vm.prank(admin);
        vault.unpause();
        vm.prank(alice);
        vault.claimSalary();
        assertEq(usdc.balanceOf(alice), 10e6);
    }

    // ------------------------------------------------------------ rescueToken

    function test_Rescue_CannotTakeEscrowedUsdc() public {
        _fundedSimple(id1); // vault holds exactly 3000e6 escrow, no surplus
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(ZalaryPayrollVault.RescueExceedsSurplus.selector, 1, 0));
        vault.rescueToken(address(usdc), sink, 1);
        assertEq(usdc.balanceOf(address(vault)), SIMPLE_TOTAL);
    }

    function test_Rescue_OnlySurplusAboveEscrow() public {
        _fundedSimple(id1);
        usdc.mint(address(vault), 500e6); // accidental donation
        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(ZalaryPayrollVault.RescueExceedsSurplus.selector, 500e6 + 1, 500e6)
        );
        vault.rescueToken(address(usdc), sink, 500e6 + 1);

        vm.prank(admin);
        vm.expectEmit(true, true, false, true, address(vault));
        emit ZalaryPayrollVault.EmergencyRescue(address(usdc), sink, 500e6);
        vault.rescueToken(address(usdc), sink, 500e6);
        assertEq(usdc.balanceOf(sink), 500e6);
        assertEq(usdc.balanceOf(address(vault)), SIMPLE_TOTAL);
        assertEq(vault.totalEscrowed(), SIMPLE_TOTAL);

        // employees can still be paid in full
        vm.prank(alice);
        vault.claimSalary();
        vm.prank(bob);
        vault.claimSalary();
        assertEq(usdc.balanceOf(alice) + usdc.balanceOf(bob), SIMPLE_TOTAL);
    }

    function test_Rescue_PartialSurplus() public {
        _fundedSimple(id1);
        usdc.mint(address(vault), 100e6);
        vm.prank(admin);
        vault.rescueToken(address(usdc), sink, 40e6);
        vm.prank(admin);
        vault.rescueToken(address(usdc), sink, 60e6);
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(ZalaryPayrollVault.RescueExceedsSurplus.selector, 1, 0));
        vault.rescueToken(address(usdc), sink, 1);
    }

    function test_Rescue_UsdcFullBalanceWhenNoEscrow() public {
        usdc.mint(address(vault), 77e6);
        vm.prank(admin);
        vault.rescueToken(address(usdc), sink, 77e6);
        assertEq(usdc.balanceOf(sink), 77e6);
    }

    function test_Rescue_OtherTokenFullAmount() public {
        _fundedSimple(id1);
        MockERC20 other = new MockERC20("Other", "OTH", 18);
        other.mint(address(vault), 123e18);
        vm.prank(admin);
        vm.expectEmit(true, true, false, true, address(vault));
        emit ZalaryPayrollVault.EmergencyRescue(address(other), sink, 123e18);
        vault.rescueToken(address(other), sink, 123e18);
        assertEq(other.balanceOf(sink), 123e18);
        assertEq(other.balanceOf(address(vault)), 0);
        assertEq(vault.totalEscrowed(), SIMPLE_TOTAL);
    }

    function test_Rescue_AvailableWhilePaused() public {
        MockERC20 other = new MockERC20("Other", "OTH", 18);
        other.mint(address(vault), 1e18);
        vm.prank(admin);
        vault.pause();
        vm.prank(admin);
        vault.rescueToken(address(other), sink, 1e18);
        assertEq(other.balanceOf(sink), 1e18);
    }

    function test_Rescue_OnlyAdmin() public {
        usdc.mint(address(vault), 10e6);
        address[4] memory bad = [hr, fin, relayer, rando];
        for (uint256 i; i < 4; ++i) {
            vm.prank(bad[i]);
            vm.expectRevert(_unauth(bad[i], ADMIN_ROLE));
            vault.rescueToken(address(usdc), sink, 1);
        }
    }

    function test_Rescue_RevertsZeroInputs() public {
        vm.startPrank(admin);
        vm.expectRevert(ZalaryPayrollVault.ZeroAddress.selector);
        vault.rescueToken(address(0), sink, 1);
        vm.expectRevert(ZalaryPayrollVault.ZeroAddress.selector);
        vault.rescueToken(address(usdc), address(0), 1);
        vm.expectRevert(ZalaryPayrollVault.ZeroAmount.selector);
        vault.rescueToken(address(usdc), sink, 0);
        vm.stopPrank();
    }

    function test_Rescue_UsdcUndercollateralizedBlocksAnyRescue() public {
        _fundedSimple(id1);
        // simulate lost balance (e.g. external burn): remove tokens from the vault
        vm.prank(address(vault));
        usdc.transfer(sink, 1);
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(ZalaryPayrollVault.RescueExceedsSurplus.selector, 1, 0));
        vault.rescueToken(address(usdc), sink, 1);
    }

    // ------------------------------------------------------- admin handover

    function test_Admin_DirectGrantOrRenounceOfAdminRoleBlocked() public {
        vm.prank(admin);
        vm.expectRevert(IAccessControlDefaultAdminRules.AccessControlEnforcedDefaultAdminRules.selector);
        vault.grantRole(ADMIN_ROLE, newAdmin);

        vm.prank(admin);
        // renouncing the admin role is only possible via a delayed transfer to address(0)
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControlDefaultAdminRules.AccessControlEnforcedDefaultAdminDelay.selector, 0)
        );
        vault.renounceRole(ADMIN_ROLE, admin);

        vm.prank(admin);
        vm.expectRevert(IAccessControlDefaultAdminRules.AccessControlEnforcedDefaultAdminRules.selector);
        vault.revokeRole(ADMIN_ROLE, admin);
    }

    function test_Admin_TwoStepHandover() public {
        vm.prank(admin);
        vault.beginDefaultAdminTransfer(newAdmin);
        (address pending, uint48 schedule) = vault.pendingDefaultAdmin();
        assertEq(pending, newAdmin);
        assertEq(schedule, uint48(block.timestamp) + ADMIN_DELAY);
        // nothing changed yet
        assertEq(vault.defaultAdmin(), admin);

        // too early
        vm.prank(newAdmin);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControlDefaultAdminRules.AccessControlEnforcedDefaultAdminDelay.selector, schedule)
        );
        vault.acceptDefaultAdminTransfer();

        // wrong acceptor, even after the delay
        vm.warp(schedule + 1);
        vm.prank(rando);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControlDefaultAdminRules.AccessControlInvalidDefaultAdmin.selector, rando)
        );
        vault.acceptDefaultAdminTransfer();

        vm.prank(newAdmin);
        vault.acceptDefaultAdminTransfer();
        assertEq(vault.defaultAdmin(), newAdmin);
        assertTrue(vault.hasRole(ADMIN_ROLE, newAdmin));
        assertFalse(vault.hasRole(ADMIN_ROLE, admin));

        // new admin has admin powers; old one doesn't
        vm.prank(newAdmin);
        vault.setProtocolFee(50, feeRec);
        assertEq(vault.feeBps(), 50);
        vm.prank(admin);
        vm.expectRevert(_unauth(admin, ADMIN_ROLE));
        vault.setProtocolFee(60, feeRec);
    }

    function test_Admin_OnlyAdminCanBeginAndCancelTransfer() public {
        vm.prank(rando);
        vm.expectRevert(_unauth(rando, ADMIN_ROLE));
        vault.beginDefaultAdminTransfer(rando);

        vm.prank(admin);
        vault.beginDefaultAdminTransfer(newAdmin);
        vm.prank(rando);
        vm.expectRevert(_unauth(rando, ADMIN_ROLE));
        vault.cancelDefaultAdminTransfer();

        vm.prank(admin);
        vault.cancelDefaultAdminTransfer();
        (address pending,) = vault.pendingDefaultAdmin();
        assertEq(pending, address(0));
        vm.warp(block.timestamp + ADMIN_DELAY + 1);
        vm.prank(newAdmin);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControlDefaultAdminRules.AccessControlInvalidDefaultAdmin.selector, newAdmin)
        );
        vault.acceptDefaultAdminTransfer();
    }

    function test_Admin_GrantRoleGatedToAdmin() public {
        vm.prank(hr);
        vm.expectRevert(_unauth(hr, ADMIN_ROLE));
        vault.grantRole(HR, rando);
        vm.prank(admin);
        vault.grantRole(HR, rando);
        assertTrue(vault.hasRole(HR, rando));
    }

    function test_Admin_HandoverGrantsNoPauserRoleToAnyone() public {
        // PAUSER_ROLE is never granted implicitly: not at construction, not on handover.
        vm.prank(admin);
        vault.beginDefaultAdminTransfer(newAdmin);
        vm.warp(block.timestamp + ADMIN_DELAY + 1);
        vm.prank(newAdmin);
        vault.acceptDefaultAdminTransfer();
        assertFalse(vault.hasRole(PAUSER, admin), "old admin has no PAUSER_ROLE");
        assertFalse(vault.hasRole(PAUSER, newAdmin), "new admin has no PAUSER_ROLE role (pauses via admin role)");
    }
}
