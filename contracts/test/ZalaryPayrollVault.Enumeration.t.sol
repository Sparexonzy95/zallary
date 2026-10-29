// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ZalaryPayrollVaultTestBase} from "./ZalaryPayrollVault.Base.t.sol";
import {ZalaryPayrollVault} from "../ZalaryPayrollVault.sol";

contract ZalaryPayrollVaultEnumerationTest is ZalaryPayrollVaultTestBase {
    // ------------------------------------------------------------- helpers

    function _contains(address[] memory a, address x) internal pure returns (bool) {
        for (uint256 i; i < a.length; ++i) {
            if (a[i] == x) return true;
        }
        return false;
    }

    function _containsId(bytes32[] memory a, bytes32 x) internal pure returns (bool) {
        for (uint256 i; i < a.length; ++i) {
            if (a[i] == x) return true;
        }
        return false;
    }

    function _noDuplicates(address[] memory a) internal pure returns (bool) {
        for (uint256 i; i < a.length; ++i) {
            for (uint256 j = i + 1; j < a.length; ++j) {
                if (a[i] == a[j]) return false;
            }
        }
        return true;
    }

    function _members(bytes32 role) internal view returns (address[] memory) {
        return vault.getRoleMembers(role, 0, 100);
    }

    function _direct(bytes32 id) internal {
        (address[] memory e, uint256[] memory m) = _arr2(alice, A_AMT, bob, B_AMT);
        (, uint256 charge) = vault.calculateFee(SIMPLE_TOTAL);
        usdc.mint(dual, charge);
        vm.startPrank(dual);
        usdc.approve(address(vault), charge);
        vault.fundPayrollDirect(id, uint64(block.timestamp + WEEK), e, m, SIMPLE_TOTAL);
        vm.stopPrank();
    }

    function _grantMany(bytes32 role, uint256 n) internal {
        vm.startPrank(admin);
        for (uint256 i; i < n; ++i) {
            vault.grantRole(role, address(uint160(0x10000 + i)));
        }
        vm.stopPrank();
    }

    // ------------------------------------------------------- payrollCount / ids

    function test_PayrollCount_StartsAtZero() public view {
        assertEq(vault.payrollCount(), 0);
        assertEq(vault.getPayrollIds(0, 10).length, 0);
    }

    function test_PayrollCount_GrowsOnCreateDraft() public {
        _draftSimple(_id(1));
        assertEq(vault.payrollCount(), 1);
        _draftSimple(_id(2));
        assertEq(vault.payrollCount(), 2);
        bytes32[] memory ids = vault.getPayrollIds(0, 10);
        assertEq(ids.length, 2);
        assertEq(ids[0], _id(1));
        assertEq(ids[1], _id(2));
    }

    function test_PayrollCount_GrowsOnFundPayrollDirect() public {
        _direct(_id(1));
        assertEq(vault.payrollCount(), 1);
        assertEq(vault.getPayrollIds(0, 10)[0], _id(1));
    }

    function test_PayrollCount_DirectAndDraftPreserveCreationOrder() public {
        _draftSimple(_id(1));
        _direct(_id(2));
        _draftSimple(_id(3));
        bytes32[] memory ids = vault.getPayrollIds(0, 10);
        assertEq(ids.length, 3);
        assertEq(ids[0], _id(1));
        assertEq(ids[1], _id(2));
        assertEq(ids[2], _id(3));
    }

    function test_PayrollCount_UnchangedByCancel() public {
        _draftSimple(_id(1));
        vm.prank(hr);
        vault.cancelPayrollDraft(_id(1));
        assertEq(vault.payrollCount(), 1);
        bytes32[] memory ids = vault.getPayrollIds(0, 10);
        assertEq(ids.length, 1);
        assertEq(ids[0], _id(1)); // cancelled id stays listed
    }

    function test_PayrollCount_UnchangedByFundPayroll() public {
        _draftSimple(_id(1));
        assertEq(vault.payrollCount(), 1);
        _fund(_id(1));
        assertEq(vault.payrollCount(), 1);
        assertTrue(_containsId(vault.getPayrollIds(0, 10), _id(1))); // funded id stays listed
    }

    function test_PayrollCount_UnchangedBySettlement() public {
        _fundedSimple(_id(1));
        vm.prank(alice);
        vault.claimSalary();
        vm.prank(bob);
        vault.claimSalary();
        assertEq(uint8(_status(_id(1))), uint8(ZalaryPayrollVault.PayrollStatus.COMPLETED));
        assertEq(vault.payrollCount(), 1);
        assertEq(vault.getPayrollIds(0, 5)[0], _id(1));
    }

    function test_PayrollCount_FailedCreateDoesNotGrow() public {
        _draftSimple(_id(1));
        (address[] memory e, uint256[] memory m) = _arr2(alice, A_AMT, bob, B_AMT);
        vm.prank(hr);
        vm.expectRevert(abi.encodeWithSelector(ZalaryPayrollVault.PayrollAlreadyExists.selector, _id(1)));
        vault.createPayrollDraft(_id(1), uint64(block.timestamp + WEEK), e, m, SIMPLE_TOTAL);
        assertEq(vault.payrollCount(), 1);
    }

    function test_GetPayrollIds_Paging() public {
        for (uint256 i = 1; i <= 5; ++i) _draftSimple(_id(i));
        bytes32[] memory p0 = vault.getPayrollIds(0, 2);
        bytes32[] memory p1 = vault.getPayrollIds(2, 2);
        bytes32[] memory p2 = vault.getPayrollIds(4, 2);
        assertEq(p0.length, 2);
        assertEq(p1.length, 2);
        assertEq(p2.length, 1); // remaining clamp
        assertEq(p0[0], _id(1));
        assertEq(p0[1], _id(2));
        assertEq(p1[0], _id(3));
        assertEq(p1[1], _id(4));
        assertEq(p2[0], _id(5));
    }

    function test_GetPayrollIds_ZeroLimitReturnsEmpty() public {
        _draftSimple(_id(1));
        assertEq(vault.getPayrollIds(0, 0).length, 0);
    }

    function test_GetPayrollIds_OffsetAtOrBeyondLengthEmpty() public {
        _draftSimple(_id(1));
        _draftSimple(_id(2));
        assertEq(vault.getPayrollIds(2, 10).length, 0);
        assertEq(vault.getPayrollIds(3, 10).length, 0);
        assertEq(vault.getPayrollIds(type(uint256).max, type(uint256).max).length, 0);
    }

    function test_GetPayrollIds_LimitCappedAt100() public {
        for (uint256 i = 1; i <= 105; ++i) _draftSimple(_id(i));
        assertEq(vault.payrollCount(), 105);
        bytes32[] memory a = vault.getPayrollIds(0, 1000);
        assertEq(a.length, 100);
        assertEq(a[0], _id(1));
        assertEq(a[99], _id(100));
        bytes32[] memory b = vault.getPayrollIds(100, 1000);
        assertEq(b.length, 5);
        assertEq(b[4], _id(105));
        assertEq(vault.getPayrollIds(0, type(uint256).max).length, 100);
    }

    function testFuzz_GetPayrollIds_PageMatchesSlice(uint8 n, uint256 offset, uint256 limit) public {
        n = uint8(bound(n, 0, 30));
        for (uint256 i = 1; i <= n; ++i) _draftSimple(_id(i));
        offset = bound(offset, 0, 40);
        limit = bound(limit, 0, 150);
        bytes32[] memory page = vault.getPayrollIds(offset, limit);
        uint256 expected = offset >= n ? 0 : n - offset;
        if (expected > limit) expected = limit;
        assertEq(page.length, expected);
        for (uint256 i; i < page.length; ++i) {
            assertEq(page[i], _id(offset + i + 1));
        }
    }

    // ------------------------------------------------------ role: constructor

    function test_Roles_ConstructorAdminIsDefaultAdminAndPauser() public view {
        assertEq(vault.roleMemberCount(ADMIN_ROLE), 1);
        assertEq(vault.roleMemberCount(PAUSER), 1);
        address[] memory a = _members(ADMIN_ROLE);
        address[] memory p = _members(PAUSER);
        assertEq(a.length, 1);
        assertEq(p.length, 1);
        assertEq(a[0], admin);
        assertEq(p[0], admin);
    }

    function test_Roles_FreshVaultHasNoOperationalMembers() public {
        ZalaryPayrollVault v = new ZalaryPayrollVault(address(usdc), admin, ADMIN_DELAY, feeRec, FEE_BPS);
        assertEq(v.roleMemberCount(HR), 0);
        assertEq(v.roleMemberCount(FIN), 0);
        assertEq(v.roleMemberCount(RELAYER), 0);
        assertEq(v.roleMemberCount(ADMIN_ROLE), 1);
        assertEq(v.roleMemberCount(PAUSER), 1);
        assertEq(v.getRoleMembers(HR, 0, 10).length, 0);
    }

    function test_Roles_BaseFixtureGrantsAreEnumerated() public view {
        address[] memory h = _members(HR);
        address[] memory f = _members(FIN);
        address[] memory r = _members(RELAYER);
        assertEq(h.length, 2);
        assertTrue(_contains(h, hr));
        assertTrue(_contains(h, dual));
        assertEq(f.length, 3);
        assertTrue(_contains(f, fin));
        assertTrue(_contains(f, fin2));
        assertTrue(_contains(f, dual));
        assertEq(r.length, 1);
        assertEq(r[0], relayer);
        assertEq(vault.roleMemberCount(HR), 2);
        assertEq(vault.roleMemberCount(FIN), 3);
        assertEq(vault.roleMemberCount(RELAYER), 1);
    }

    // ----------------------------------------------------------- grant / revoke

    function test_GrantRole_AddsHrFinanceRelayerMembers() public {
        address x = makeAddr("x");
        vm.startPrank(admin);
        vault.grantRole(HR, x);
        vault.grantRole(FIN, x);
        vault.grantRole(RELAYER, x);
        vm.stopPrank();
        assertTrue(_contains(_members(HR), x));
        assertTrue(_contains(_members(FIN), x));
        assertTrue(_contains(_members(RELAYER), x));
        assertEq(vault.roleMemberCount(HR), 3);
        assertEq(vault.roleMemberCount(FIN), 4);
        assertEq(vault.roleMemberCount(RELAYER), 2);
    }

    function test_GrantRole_PauserAddsMember() public {
        address x = makeAddr("x");
        vm.prank(admin);
        vault.grantRole(PAUSER, x);
        assertEq(vault.roleMemberCount(PAUSER), 2);
        assertTrue(_contains(_members(PAUSER), x));
        assertTrue(_contains(_members(PAUSER), admin));
    }

    function test_GrantRole_DuplicateDoesNotDuplicate() public {
        address x = makeAddr("x");
        vm.startPrank(admin);
        vault.grantRole(HR, x);
        vault.grantRole(HR, x);
        vault.grantRole(HR, hr); // pre-existing member from fixture
        vm.stopPrank();
        assertEq(vault.roleMemberCount(HR), 3);
        assertTrue(_noDuplicates(_members(HR)));
    }

    function test_RevokeRole_RemovesMember() public {
        vm.prank(admin);
        vault.revokeRole(FIN, fin);
        assertEq(vault.roleMemberCount(FIN), 2);
        address[] memory f = _members(FIN);
        assertFalse(_contains(f, fin));
        assertTrue(_contains(f, fin2));
        assertTrue(_contains(f, dual));
        assertFalse(vault.hasRole(FIN, fin));
    }

    function test_RevokeRole_NonMemberIsNoOp() public {
        vm.prank(admin);
        vault.revokeRole(HR, rando);
        assertEq(vault.roleMemberCount(HR), 2);
    }

    function test_RevokeRole_ThenRegrantRestoresMembership() public {
        vm.startPrank(admin);
        vault.revokeRole(RELAYER, relayer);
        assertEq(vault.roleMemberCount(RELAYER), 0);
        vault.grantRole(RELAYER, relayer);
        vm.stopPrank();
        assertEq(vault.roleMemberCount(RELAYER), 1);
        assertEq(_members(RELAYER)[0], relayer);
    }

    function test_RenounceRole_RemovesMember() public {
        vm.prank(hr);
        vault.renounceRole(HR, hr);
        assertEq(vault.roleMemberCount(HR), 1);
        address[] memory h = _members(HR);
        assertFalse(_contains(h, hr));
        assertTrue(_contains(h, dual));
        // dual's other role is untouched
        assertTrue(_contains(_members(FIN), dual));
    }

    function test_RenounceRole_NonMemberIsNoOp() public {
        vm.prank(rando);
        vault.renounceRole(HR, rando);
        assertEq(vault.roleMemberCount(HR), 2);
    }

    function test_RenounceRole_PauserRemovesPauserOnly() public {
        vm.prank(admin);
        vault.renounceRole(PAUSER, admin);
        assertEq(vault.roleMemberCount(PAUSER), 0);
        assertEq(vault.roleMemberCount(ADMIN_ROLE), 1);
        assertTrue(vault.hasRole(ADMIN_ROLE, admin));
    }

    function test_RoleAdmin_NonAdminGrantDoesNotChangeMembers() public {
        vm.prank(rando);
        vm.expectRevert();
        vault.grantRole(HR, rando);
        assertEq(vault.roleMemberCount(HR), 2);
        assertFalse(_contains(_members(HR), rando));
    }

    function test_DefaultAdminRole_CannotBeGrantedDirectly() public {
        vm.prank(admin);
        vm.expectRevert();
        vault.grantRole(ADMIN_ROLE, rando);
        assertEq(vault.roleMemberCount(ADMIN_ROLE), 1);
        assertEq(_members(ADMIN_ROLE)[0], admin);
    }

    // ------------------------------------------------------- role paging / cap

    function test_GetRoleMembers_Paging() public {
        _grantMany(RELAYER, 4); // + fixture relayer = 5
        assertEq(vault.roleMemberCount(RELAYER), 5);
        address[] memory p0 = vault.getRoleMembers(RELAYER, 0, 2);
        address[] memory p1 = vault.getRoleMembers(RELAYER, 2, 2);
        address[] memory p2 = vault.getRoleMembers(RELAYER, 4, 2);
        assertEq(p0.length, 2);
        assertEq(p1.length, 2);
        assertEq(p2.length, 1);
        address[] memory all = vault.getRoleMembers(RELAYER, 0, 100);
        assertEq(all[0], p0[0]);
        assertEq(all[1], p0[1]);
        assertEq(all[2], p1[0]);
        assertEq(all[3], p1[1]);
        assertEq(all[4], p2[0]);
        assertTrue(_noDuplicates(all));
    }

    function test_GetRoleMembers_ZeroLimitAndOffsetBeyondLengthEmpty() public view {
        assertEq(vault.getRoleMembers(HR, 0, 0).length, 0);
        assertEq(vault.getRoleMembers(HR, 2, 10).length, 0);
        assertEq(vault.getRoleMembers(HR, 99, 10).length, 0);
        assertEq(vault.getRoleMembers(HR, type(uint256).max, type(uint256).max).length, 0);
        assertEq(vault.getRoleMembers(keccak256("UNKNOWN_ROLE"), 0, 10).length, 0);
        assertEq(vault.roleMemberCount(keccak256("UNKNOWN_ROLE")), 0);
    }

    function test_GetRoleMembers_LimitCappedAt100() public {
        _grantMany(HR, 105); // + 2 fixture = 107
        assertEq(vault.roleMemberCount(HR), 107);
        assertEq(vault.getRoleMembers(HR, 0, 1000).length, 100);
        assertEq(vault.getRoleMembers(HR, 0, type(uint256).max).length, 100);
        assertEq(vault.getRoleMembers(HR, 100, 1000).length, 7); // remaining clamp
        assertEq(vault.getRoleMembers(HR, 106, 1000).length, 1);
        assertEq(vault.getRoleMembers(HR, 107, 1000).length, 0);
    }

    // ------------------------------------------------------- fuzz: equals hasRole

    function _roleOf(uint8 i) internal view returns (bytes32) {
        uint8 k = i % 4;
        if (k == 0) return HR;
        if (k == 1) return FIN;
        if (k == 2) return RELAYER;
        return PAUSER;
    }

    function testFuzz_Membership_EqualsHasRole(uint8[] memory ops) public {
        address[6] memory pool;
        for (uint256 i; i < 6; ++i) pool[i] = address(uint160(0xBEEF00 + i));
        uint256 len = ops.length > 40 ? 40 : ops.length;
        for (uint256 i; i < len; ++i) {
            uint8 op = ops[i];
            bytes32 role = _roleOf(op);
            address who = pool[(op / 4) % 6];
            uint8 action = (op / 24) % 3;
            if (action == 0) {
                vm.prank(admin);
                vault.grantRole(role, who);
            } else if (action == 1) {
                vm.prank(admin);
                vault.revokeRole(role, who);
            } else {
                vm.prank(who);
                vault.renounceRole(role, who);
            }
        }
        bytes32[4] memory roles = [HR, FIN, RELAYER, PAUSER];
        for (uint256 r; r < 4; ++r) {
            bytes32 role = roles[r];
            address[] memory members = _members(role);
            assertEq(members.length, vault.roleMemberCount(role));
            assertTrue(_noDuplicates(members));
            uint256 expected;
            for (uint256 i; i < members.length; ++i) {
                assertTrue(vault.hasRole(role, members[i]));
            }
            for (uint256 i; i < 6; ++i) {
                bool has = vault.hasRole(role, pool[i]);
                assertEq(_contains(members, pool[i]), has);
                if (has) ++expected;
            }
            // fixture accounts are never touched by the pool; count them separately
            uint256 fixtureMembers;
            address[8] memory known = [admin, hr, fin, fin2, dual, relayer, alice, rando];
            for (uint256 i; i < 8; ++i) {
                if (vault.hasRole(role, known[i])) ++fixtureMembers;
            }
            assertEq(members.length, expected + fixtureMembers);
        }
    }

    // --------------------------------------------- default admin 2-step transfer

    function test_DefaultAdminTransfer_MovesAdminMembershipKeepsPauser() public {
        address newAdmin = makeAddr("newAdmin");
        vm.prank(admin);
        vault.beginDefaultAdminTransfer(newAdmin);

        // Pending only: nothing moves yet.
        assertEq(vault.roleMemberCount(ADMIN_ROLE), 1);
        assertEq(_members(ADMIN_ROLE)[0], admin);

        skip(uint256(ADMIN_DELAY) + 1);
        vm.prank(newAdmin);
        vault.acceptDefaultAdminTransfer();

        assertEq(vault.defaultAdmin(), newAdmin);
        assertEq(vault.roleMemberCount(ADMIN_ROLE), 1);
        address[] memory a = _members(ADMIN_ROLE);
        assertEq(a.length, 1);
        assertEq(a[0], newAdmin);
        assertFalse(vault.hasRole(ADMIN_ROLE, admin));
        assertTrue(vault.hasRole(ADMIN_ROLE, newAdmin));

        // Old admin keeps PAUSER_ROLE; new admin does not gain it.
        assertEq(vault.roleMemberCount(PAUSER), 1);
        address[] memory p = _members(PAUSER);
        assertEq(p[0], admin);
        assertTrue(vault.hasRole(PAUSER, admin));
        assertFalse(vault.hasRole(PAUSER, newAdmin));
    }

    function test_DefaultAdminTransfer_NotMovedBeforeDelayElapses() public {
        address newAdmin = makeAddr("newAdmin");
        vm.prank(admin);
        vault.beginDefaultAdminTransfer(newAdmin);
        vm.prank(newAdmin);
        vm.expectRevert();
        vault.acceptDefaultAdminTransfer();
        assertEq(_members(ADMIN_ROLE)[0], admin);
        assertEq(vault.roleMemberCount(ADMIN_ROLE), 1);
    }

    function test_DefaultAdminTransfer_CancelledKeepsMembership() public {
        address newAdmin = makeAddr("newAdmin");
        vm.startPrank(admin);
        vault.beginDefaultAdminTransfer(newAdmin);
        vault.cancelDefaultAdminTransfer();
        vm.stopPrank();
        skip(uint256(ADMIN_DELAY) + 1);
        vm.prank(newAdmin);
        vm.expectRevert();
        vault.acceptDefaultAdminTransfer();
        assertEq(vault.roleMemberCount(ADMIN_ROLE), 1);
        assertEq(_members(ADMIN_ROLE)[0], admin);
    }

    function test_DefaultAdminRenounce_RemovesLastAdminAfterDelay() public {
        vm.prank(admin);
        vault.beginDefaultAdminTransfer(address(0)); // OZ requires a scheduled transfer to zero first
        assertEq(vault.roleMemberCount(ADMIN_ROLE), 1);
        skip(uint256(ADMIN_DELAY) + 1);
        vm.prank(admin);
        vault.renounceRole(ADMIN_ROLE, admin);
        assertEq(vault.roleMemberCount(ADMIN_ROLE), 0);
        assertEq(vault.getRoleMembers(ADMIN_ROLE, 0, 10).length, 0);
        assertEq(vault.roleMemberCount(PAUSER), 1); // pauser untouched
    }

    function test_DefaultAdminTransfer_NewAdminCanThenManageRolesAndEnumeration() public {
        address newAdmin = makeAddr("newAdmin");
        vm.prank(admin);
        vault.beginDefaultAdminTransfer(newAdmin);
        skip(uint256(ADMIN_DELAY) + 1);
        vm.prank(newAdmin);
        vault.acceptDefaultAdminTransfer();

        vm.prank(newAdmin);
        vault.grantRole(HR, rando);
        assertTrue(_contains(_members(HR), rando));
        assertEq(vault.roleMemberCount(HR), 3);
        // old admin can no longer grant
        vm.prank(admin);
        vm.expectRevert();
        vault.grantRole(HR, bob);
        assertEq(vault.roleMemberCount(HR), 3);
    }
}
