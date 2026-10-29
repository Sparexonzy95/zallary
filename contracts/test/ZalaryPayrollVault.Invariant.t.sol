// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ZalaryPayrollVaultTestBase} from "./ZalaryPayrollVault.Base.t.sol";
import {ZalaryPayrollVault} from "../ZalaryPayrollVault.sol";
import {MockERC20} from "../test-helpers/MockERC20.sol";

/// @dev Drives random sequences of create/fund/claim/refund/rescue/fee changes.
contract PayrollHandler is Test {
    ZalaryPayrollVault public vault;
    MockERC20 public usdc;
    address public admin;
    address public hr;
    address public fin;
    address public relayer;
    address public feeRec;

    address[] public employees;
    bytes32[] public payrollIds;
    uint256 internal nonce;

    // ghost accounting
    uint256 public ghostFunded; // salary escrowed in total
    uint256 public ghostClaimed;
    uint256 public ghostRefunded;
    uint256 public ghostRescued;
    uint256 public ghostDonated;

    constructor(ZalaryPayrollVault v, MockERC20 t, address admin_, address hr_, address fin_, address relayer_, address feeRec_) {
        vault = v;
        usdc = t;
        admin = admin_;
        hr = hr_;
        fin = fin_;
        relayer = relayer_;
        feeRec = feeRec_;
        for (uint256 i; i < 6; ++i) {
            employees.push(address(uint160(0xE000 + i)));
        }
        vm.prank(fin);
        usdc.approve(address(vault), type(uint256).max);
    }

    function payrollCount() external view returns (uint256) {
        return payrollIds.length;
    }

    function employeeCount() external view returns (uint256) {
        return employees.length;
    }

    function createAndFund(uint256 nSeed, uint256 amtSeed, uint256 dlSeed) external {
        uint256 n = bound(nSeed, 1, employees.length);
        address[] memory e = new address[](n);
        uint256[] memory m = new uint256[](n);
        uint256 total;
        for (uint256 i; i < n; ++i) {
            e[i] = employees[i];
            m[i] = bound(uint256(keccak256(abi.encode(amtSeed, i))), 1, 50_000e6);
            total += m[i];
        }
        bytes32 id = keccak256(abi.encode("h", ++nonce));
        uint64 dl = uint64(block.timestamp + bound(dlSeed, 1 hours, 30 days));
        vm.prank(hr);
        vault.createPayrollDraft(id, dl, e, m, total);
        (, uint256 charge) = vault.calculateFee(total);
        usdc.mint(fin, charge);
        vm.prank(fin);
        vault.fundPayroll(id);
        payrollIds.push(id);
        ghostFunded += total;
    }

    function claimSalary(uint256 empSeed) external {
        address emp = employees[bound(empSeed, 0, employees.length - 1)];
        uint256 before = usdc.balanceOf(emp);
        vm.prank(emp);
        try vault.claimSalary() {
            ghostClaimed += usdc.balanceOf(emp) - before;
        } catch {}
    }

    function claimSalaryFor(uint256 empSeed) external {
        address emp = employees[bound(empSeed, 0, employees.length - 1)];
        uint256 before = usdc.balanceOf(emp);
        vm.prank(relayer);
        try vault.claimSalaryFor(emp) {
            ghostClaimed += usdc.balanceOf(emp) - before;
        } catch {}
    }

    function claimPayroll(uint256 idSeed, uint256 empSeed) external {
        if (payrollIds.length == 0) return;
        bytes32 id = payrollIds[bound(idSeed, 0, payrollIds.length - 1)];
        address emp = employees[bound(empSeed, 0, employees.length - 1)];
        uint256 before = usdc.balanceOf(emp);
        vm.prank(emp);
        try vault.claimPayrollSalary(id) {
            ghostClaimed += usdc.balanceOf(emp) - before;
        } catch {}
    }

    function refund(uint256 idSeed, uint256 empSeed) external {
        if (payrollIds.length == 0) return;
        bytes32 id = payrollIds[bound(idSeed, 0, payrollIds.length - 1)];
        address emp = employees[bound(empSeed, 0, employees.length - 1)];
        uint64 dl = vault.getPayroll(id).deadline;
        if (block.timestamp <= dl) vm.warp(uint256(dl) + 1);
        address employer = vault.getPayroll(id).employer; // refunds go to the original funder
        uint256 before = usdc.balanceOf(employer);
        vm.prank(fin);
        try vault.refundLeftover(id, emp) {
            ghostRefunded += usdc.balanceOf(employer) - before;
        } catch {}
    }

    function warp(uint256 secs) external {
        vm.warp(block.timestamp + bound(secs, 0, 10 days));
    }

    function donateAndRescue(uint256 donation, uint256 ask) external {
        donation = bound(donation, 0, 1_000e6);
        usdc.mint(address(vault), donation);
        ghostDonated += donation;
        ask = bound(ask, 0, usdc.balanceOf(address(vault)) + 1);
        if (ask == 0) return;
        vm.prank(admin);
        try vault.rescueToken(address(usdc), address(0xDEAD), ask) {
            ghostRescued += ask;
        } catch {}
    }

    /// Flips the separate-approver flag at random; must never affect accounting.
    function toggleSeparateApprover(bool v) external {
        vm.prank(admin);
        vault.setRequireSeparateApprover(v);
    }

    /// A single wallet holding HR + Finance creates and funds its own draft; succeeds iff the flag is off.
    function selfCreateAndFund(uint256 amtSeed) external {
        address self = address(0xD0A1);
        if (!vault.hasRole(vault.HR_ROLE(), self)) {
            vm.startPrank(admin);
            vault.grantRole(vault.HR_ROLE(), self);
            vault.grantRole(vault.FINANCE_ROLE(), self);
            vm.stopPrank();
            vm.prank(self);
            usdc.approve(address(vault), type(uint256).max);
        }
        address[] memory e = new address[](1);
        uint256[] memory m = new uint256[](1);
        e[0] = employees[0];
        m[0] = bound(amtSeed, 1, 50_000e6);
        bytes32 id = keccak256(abi.encode("self", ++nonce));
        vm.prank(self);
        vault.createPayrollDraft(id, uint64(block.timestamp + 1 days), e, m, m[0]);
        (, uint256 charge) = vault.calculateFee(m[0]);
        usdc.mint(self, charge);
        bool flag = vault.requireSeparateApprover();
        vm.prank(self);
        try vault.fundPayroll(id) {
            require(!flag, "self-funded while flag on");
            payrollIds.push(id);
            ghostFunded += m[0];
        } catch {
            require(flag, "self-funding blocked while flag off");
        }
    }

    function changeFee(uint256 bps) external {
        vm.prank(admin);
        vault.setProtocolFee(bound(bps, 0, 500), feeRec);
    }
}

contract ZalaryPayrollVaultInvariantTest is ZalaryPayrollVaultTestBase {
    PayrollHandler internal handler;

    function setUp() public override {
        super.setUp();
        handler = new PayrollHandler(vault, usdc, admin, hr, fin, relayer, feeRec);
        targetContract(address(handler));
    }

    /// USDC held always covers escrow.
    function invariant_VaultBalanceCoversEscrow() public view {
        assertGe(usdc.balanceOf(address(vault)), vault.totalEscrowed());
    }

    /// totalEscrowed == sum of remainingEscrow over funded payrolls (and zero for terminal ones).
    function invariant_TotalEscrowedEqualsSumOfRemaining() public view {
        uint256 sum;
        uint256 n = handler.payrollCount();
        for (uint256 i; i < n; ++i) {
            ZalaryPayrollVault.PayrollMeta memory p = vault.getPayroll(handler.payrollIds(i));
            if (p.status == ZalaryPayrollVault.PayrollStatus.FUNDED) {
                sum += p.remainingEscrow;
            } else {
                assertEq(p.remainingEscrow, 0, "terminal payroll holds no escrow");
            }
        }
        assertEq(vault.totalEscrowed(), sum);
    }

    /// Sum of per-employee claimable balances equals escrow, and every open allocation is accounted for.
    function invariant_ClaimableBalancesEqualEscrow() public view {
        uint256 sum;
        for (uint256 i; i < handler.employeeCount(); ++i) {
            sum += vault.getClaimableBalance(handler.employees(i));
        }
        assertEq(sum, vault.totalEscrowed());
    }

    /// Conservation: funded == claimed + refunded + still escrowed (no double pay, no leak).
    function invariant_FundedEqualsClaimedPlusRefundedPlusEscrow() public view {
        assertEq(handler.ghostFunded(), handler.ghostClaimed() + handler.ghostRefunded() + vault.totalEscrowed());
        uint256 paid;
        for (uint256 i; i < handler.employeeCount(); ++i) {
            paid += vault.totalClaimed(handler.employees(i));
        }
        assertEq(paid, handler.ghostClaimed());
    }

    /// Vault balance is exactly escrow plus donated-but-not-rescued surplus: fees never stay in the vault.
    function invariant_BalanceIsEscrowPlusUnrescuedDonations() public view {
        assertEq(
            usdc.balanceOf(address(vault)),
            vault.totalEscrowed() + handler.ghostDonated() - handler.ghostRescued()
        );
    }
}
