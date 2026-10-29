// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ZalaryPayrollVaultTestBase} from "./ZalaryPayrollVault.Base.t.sol";
import {ZalaryPayrollVault} from "../ZalaryPayrollVault.sol";

contract ZalaryPayrollVaultFuzzTest is ZalaryPayrollVaultTestBase {
    function testFuzz_CalculateFee_MatchesBpsFormula(uint256 amount, uint256 bps) public {
        bps = bound(bps, 0, 500);
        amount = bound(amount, 0, type(uint200).max);
        vm.prank(admin);
        vault.setProtocolFee(bps, feeRec);

        (uint256 fee, uint256 totalWithFee) = vault.calculateFee(amount);
        assertEq(fee, (amount * bps) / 10_000, "fee == floor(amount*bps/10000)");
        assertEq(totalWithFee, amount + fee);
        assertLe(fee, amount / 20, "fee never exceeds 5%");
    }

    function testFuzz_CalculateFee_Monotonic(uint256 a, uint256 b, uint256 bps) public {
        bps = bound(bps, 0, 500);
        a = bound(a, 0, type(uint128).max);
        b = bound(b, a, type(uint128).max);
        vm.prank(admin);
        vault.setProtocolFee(bps, feeRec);
        (uint256 fa,) = vault.calculateFee(a);
        (uint256 fb,) = vault.calculateFee(b);
        assertLe(fa, fb);
    }

    function testFuzz_Fund_PullsTotalPlusFee(uint256 a, uint256 b, uint256 bps) public {
        bps = bound(bps, 0, 500);
        a = bound(a, 1, 1e15 * 1e6);
        b = bound(b, 1, 1e15 * 1e6);
        vm.prank(admin);
        vault.setProtocolFee(bps, feeRec);

        (address[] memory e, uint256[] memory m) = _arr2(alice, a, bob, b);
        _draft(_id(1), e, m);
        uint256 total = a + b;
        uint256 expectedFee = (total * bps) / 10_000;

        _fund(_id(1)); // mints exactly total+fee to fin, so the post-balance must be zero
        assertEq(usdc.balanceOf(fin), 0, "exactly total+fee pulled");
        assertEq(usdc.balanceOf(feeRec), expectedFee);
        assertEq(usdc.balanceOf(address(vault)), total);
        assertEq(vault.totalEscrowed(), total);
        assertEq(vault.totalProtocolFeesCollected(), expectedFee);
        assertEq(vault.getPayroll(_id(1)).protocolFeePaid, expectedFee);
        assertEq(vault.getClaimableBalance(alice) + vault.getClaimableBalance(bob), total);
    }

    function testFuzz_Draft_TotalMismatchReverts(uint256 a, uint256 b, uint256 declared) public {
        a = bound(a, 1, type(uint128).max);
        b = bound(b, 1, type(uint128).max);
        declared = bound(declared, 1, uint256(type(uint128).max) * 2);
        vm.assume(declared != a + b);
        (address[] memory e, uint256[] memory m) = _arr2(alice, a, bob, b);
        vm.prank(hr);
        vm.expectRevert(
            abi.encodeWithSelector(ZalaryPayrollVault.TotalAmountMismatch.selector, declared, a + b)
        );
        vault.createPayrollDraft(_id(1), uint64(block.timestamp + WEEK), e, m, declared);
    }

    /// Random mix of claims and refunds: every unit of salary ends up either with an
    /// employee or the funding wallet; nothing is left, nothing paid twice.
    function testFuzz_SumAccounting_ClaimsPlusRefundsEqualTotal(uint8 count, uint256 seed, uint256 claimMask) public {
        uint256 n = bound(count, 1, 12);
        address[] memory e = new address[](n);
        uint256[] memory m = new uint256[](n);
        for (uint256 i; i < n; ++i) {
            e[i] = address(uint160(0xA000 + i));
            m[i] = bound(uint256(keccak256(abi.encode(seed, i))), 1, 1e12);
        }
        uint256 total = _sum(m);
        bytes32 id = _id(1);
        _draft(id, e, m);
        _fund(id);

        uint256 claimed;
        uint256 refunded;
        for (uint256 i; i < n; ++i) {
            if ((claimMask >> i) & 1 == 1) {
                vm.prank(e[i]);
                vault.claimPayrollSalary(id);
                claimed += m[i];
            }
        }
        assertEq(vault.totalEscrowed(), total - claimed);
        _expire(id);
        for (uint256 i; i < n; ++i) {
            if ((claimMask >> i) & 1 == 0) {
                vm.prank(fin);
                vault.refundLeftover(id, e[i]);
                refunded += m[i];
            }
        }
        assertEq(claimed + refunded, total);
        assertEq(vault.totalEscrowed(), 0);
        assertEq(usdc.balanceOf(address(vault)), 0);
        assertEq(usdc.balanceOf(fin), refunded);
        uint256 employeeSum;
        for (uint256 i; i < n; ++i) {
            employeeSum += usdc.balanceOf(e[i]);
            assertEq(vault.getClaimableBalance(e[i]), 0);
        }
        assertEq(employeeSum, claimed);
        assertEq(vault.getPayroll(id).remainingEscrow, 0);
        ZalaryPayrollVault.PayrollStatus st = _status(id);
        assertTrue(
            st == ZalaryPayrollVault.PayrollStatus.COMPLETED || st == ZalaryPayrollVault.PayrollStatus.REFUNDED
        );
    }

    /// forge-config: default.fuzz.runs = 12
    function testFuzz_ClaimBatch_NeedsCeilDivCalls(uint256 nPayrolls) public {
        uint256 n = bound(nPayrolls, 1, 130);
        for (uint256 i; i < n; ++i) {
            _fundedSingle(_id(100 + i), alice, 1e6);
        }
        uint256 calls;
        while (vault.openPayrollCount(alice) > 0) {
            uint256 before = vault.openPayrollCount(alice);
            vm.prank(alice);
            vault.claimSalary();
            uint256 settled = before - vault.openPayrollCount(alice);
            assertEq(settled, before > 50 ? 50 : before);
            ++calls;
        }
        assertEq(calls, (n + 49) / 50);
        assertEq(usdc.balanceOf(alice), n * 1e6);
        assertEq(vault.totalEscrowed(), 0);
    }

    function testFuzz_Rescue_NeverExceedsSurplus(uint256 donation, uint256 ask) public {
        _fundedSimple(_id(1));
        donation = bound(donation, 0, 1e15);
        ask = bound(ask, 1, 2e15);
        usdc.mint(address(vault), donation);
        vm.prank(admin);
        if (ask > donation) {
            vm.expectRevert(abi.encodeWithSelector(ZalaryPayrollVault.RescueExceedsSurplus.selector, ask, donation));
            vault.rescueToken(address(usdc), rando, ask);
        } else {
            vault.rescueToken(address(usdc), rando, ask);
            assertEq(usdc.balanceOf(rando), ask);
        }
        assertGe(usdc.balanceOf(address(vault)), vault.totalEscrowed());
    }
}
