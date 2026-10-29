// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ZalaryPayrollVaultTestBase} from "./ZalaryPayrollVault.Base.t.sol";

/// @dev Tests for the vault view getOpenPayrollIds.
contract ZalaryVaultOpenPayrollIdsTest is ZalaryPayrollVaultTestBase {
    function _fundN(uint256 n) internal {
        for (uint256 i = 1; i <= n; ++i) {
            _fundedSingle(_id(i), alice, 10e6);
        }
    }

    function _contains(bytes32[] memory arr, bytes32 x) internal pure returns (bool) {
        for (uint256 i; i < arr.length; ++i) {
            if (arr[i] == x) return true;
        }
        return false;
    }

    function test_OpenIds_EmptyForStranger() public view {
        assertEq(vault.getOpenPayrollIds(rando, 0, 10).length, 0);
        assertEq(vault.openPayrollCount(rando), 0);
    }

    function test_OpenIds_DraftNotListedUntilFunded() public {
        _draftSimple(_id(1));
        assertEq(vault.getOpenPayrollIds(alice, 0, 10).length, 0);
        _fund(_id(1));
        bytes32[] memory ids = vault.getOpenPayrollIds(alice, 0, 10);
        assertEq(ids.length, 1);
        assertEq(ids[0], _id(1));
        ids = vault.getOpenPayrollIds(bob, 0, 10);
        assertEq(ids.length, 1);
        assertEq(ids[0], _id(1));
    }

    function test_OpenIds_ListsAllOpenAfterFunding() public {
        _fundN(3);
        bytes32[] memory ids = vault.getOpenPayrollIds(alice, 0, 10);
        assertEq(ids.length, 3);
        assertEq(vault.openPayrollCount(alice), 3);
        for (uint256 i = 1; i <= 3; ++i) {
            assertTrue(_contains(ids, _id(i)));
        }
    }

    function test_OpenIds_ShrinksAfterClaim() public {
        _fundN(3);
        vm.prank(alice);
        vault.claimPayrollSalary(_id(2));
        bytes32[] memory ids = vault.getOpenPayrollIds(alice, 0, 10);
        assertEq(ids.length, 2);
        assertFalse(_contains(ids, _id(2)));
        assertTrue(_contains(ids, _id(1)));
        assertTrue(_contains(ids, _id(3)));

        vm.prank(alice);
        vault.claimSalary();
        assertEq(vault.getOpenPayrollIds(alice, 0, 10).length, 0);
    }

    function test_OpenIds_ShrinksAfterRefund() public {
        _fundN(2);
        _expire(_id(1));
        vm.prank(fin);
        vault.refundLeftover(_id(1), alice);
        bytes32[] memory ids = vault.getOpenPayrollIds(alice, 0, 10);
        assertEq(ids.length, 1);
        assertEq(ids[0], _id(2));
    }

    function test_OpenIds_Paging() public {
        _fundN(5);
        bytes32[] memory all = vault.getOpenPayrollIds(alice, 0, 100);
        assertEq(all.length, 5);

        bytes32[] memory p = vault.getOpenPayrollIds(alice, 1, 2);
        assertEq(p.length, 2);
        assertEq(p[0], all[1]);
        assertEq(p[1], all[2]);

        // remaining clamp
        p = vault.getOpenPayrollIds(alice, 3, 50);
        assertEq(p.length, 2);
        assertEq(p[0], all[3]);
        assertEq(p[1], all[4]);

        // limit zero
        assertEq(vault.getOpenPayrollIds(alice, 0, 0).length, 0);
    }

    function test_OpenIds_OffsetBeyondLengthEmpty() public {
        _fundN(3);
        assertEq(vault.getOpenPayrollIds(alice, 3, 10).length, 0);
        assertEq(vault.getOpenPayrollIds(alice, 100, 10).length, 0);
        assertEq(vault.getOpenPayrollIds(alice, type(uint256).max, type(uint256).max).length, 0);
    }

    function test_OpenIds_LimitCap100() public {
        // 105 single-employee payrolls for alice (each claim batch is separate; just listing here)
        _fundN(105);
        assertEq(vault.openPayrollCount(alice), 105);
        assertEq(vault.getOpenPayrollIds(alice, 0, 1000).length, 100);
        assertEq(vault.getOpenPayrollIds(alice, 0, type(uint256).max).length, 100);
        assertEq(vault.getOpenPayrollIds(alice, 100, 1000).length, 5);
    }
}
