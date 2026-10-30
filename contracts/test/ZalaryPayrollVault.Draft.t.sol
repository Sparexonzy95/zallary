// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ZalaryPayrollVaultTestBase} from "./ZalaryPayrollVault.Base.t.sol";
import {ZalaryPayrollVault} from "../ZalaryPayrollVault.sol";

contract ZalaryPayrollVaultDraftTest is ZalaryPayrollVaultTestBase {
    bytes32 internal id1 = _id(1);

    // ------------------------------------------------------------ deployment

    function test_Constructor_SetsConfig() public view {
        assertEq(address(vault.USDC()), address(usdc));
        assertEq(vault.feeBps(), FEE_BPS);
        assertEq(vault.feeRecipient(), feeRec);
        assertEq(vault.defaultAdmin(), admin);
        assertEq(vault.defaultAdminDelay(), ADMIN_DELAY);
        assertEq(vault.MAX_FEE_BPS(), 500);
        assertEq(vault.MAX_CLAIM_BATCH(), 50);
        assertEq(vault.MAX_EMPLOYEES_PER_PAYROLL(), 200);
    }

    function test_Constructor_AdminGetsNoPauserHrOrFinanceRole() public view {
        assertTrue(vault.hasRole(ADMIN_ROLE, admin));
        assertFalse(vault.hasRole(PAUSER, admin));
        assertFalse(vault.hasRole(HR, admin));
        assertFalse(vault.hasRole(FIN, admin));
        assertFalse(vault.isRoleMember(HR, admin));
        assertTrue(vault.isRoleMember(HR, hr));
    }

    function test_Constructor_RevertsZeroUsdc() public {
        vm.expectRevert(ZalaryPayrollVault.ZeroAddress.selector);
        new ZalaryPayrollVault(address(0), admin, ADMIN_DELAY, feeRec, FEE_BPS);
    }

    function test_Constructor_RevertsZeroAdmin() public {
        vm.expectRevert(ZalaryPayrollVault.ZeroAddress.selector);
        new ZalaryPayrollVault(address(usdc), address(0), ADMIN_DELAY, feeRec, FEE_BPS);
    }

    function test_Constructor_RevertsZeroFeeRecipient() public {
        vm.expectRevert(ZalaryPayrollVault.ZeroAddress.selector);
        new ZalaryPayrollVault(address(usdc), admin, ADMIN_DELAY, address(0), FEE_BPS);
    }

    function test_Constructor_RevertsFeeAboveCap() public {
        vm.expectRevert(abi.encodeWithSelector(ZalaryPayrollVault.FeeTooHigh.selector, 501, 500));
        new ZalaryPayrollVault(address(usdc), admin, ADMIN_DELAY, feeRec, 501);
    }

    function test_Constructor_AcceptsFeeAtCap() public {
        ZalaryPayrollVault v = new ZalaryPayrollVault(address(usdc), admin, ADMIN_DELAY, feeRec, 500);
        assertEq(v.feeBps(), 500);
    }

    // ----------------------------------------------------------- role gating

    function test_RoleGating_HrCreatesDraft() public {
        _draftSimple(id1);
        assertTrue(vault.getPayroll(id1).exists);
    }

    function test_RoleGating_AdminCannotCreateDraftByDefault() public {
        (address[] memory e, uint256[] memory m) = _arr(alice, 10e6);
        vm.prank(admin);
        vm.expectRevert(ZalaryPayrollVault.NotHR.selector);
        vault.createPayrollDraft(id1, uint64(block.timestamp + WEEK), e, m, 10e6);
    }

    function test_RoleGating_FinanceCannotCreateDraft() public {
        (address[] memory e, uint256[] memory m) = _arr(alice, 10e6);
        vm.prank(fin);
        vm.expectRevert(ZalaryPayrollVault.NotHR.selector);
        vault.createPayrollDraft(id1, uint64(block.timestamp + WEEK), e, m, 10e6);
    }

    function test_RoleGating_RandoCannotCreateDraft() public {
        (address[] memory e, uint256[] memory m) = _arr(alice, 10e6);
        vm.prank(rando);
        vm.expectRevert(ZalaryPayrollVault.NotHR.selector);
        vault.createPayrollDraft(id1, uint64(block.timestamp + WEEK), e, m, 10e6);
    }

    function test_RoleGating_HrCannotFund() public {
        _draftSimple(id1);
        vm.prank(hr);
        vm.expectRevert(ZalaryPayrollVault.NotFinance.selector);
        vault.fundPayroll(id1);
    }

    function test_RoleGating_AdminCannotFund() public {
        _draftSimple(id1);
        vm.prank(admin);
        vm.expectRevert(ZalaryPayrollVault.NotFinance.selector);
        vault.fundPayroll(id1);
    }

    // ------------------------------------------------------------ draft path

    function test_CreateDraft_RecordsStateAndMovesNoFunds() public {
        _draftSimple(id1);
        ZalaryPayrollVault.PayrollMeta memory p = vault.getPayroll(id1);
        assertEq(p.createdByHR, hr);
        assertEq(p.employer, address(0));
        assertEq(p.fundedByFinance, address(0));
        assertEq(p.employeeCount, 2);
        assertEq(p.totalFunded, SIMPLE_TOTAL);
        assertEq(p.remainingEscrow, 0);
        assertEq(p.protocolFeePaid, 0);
        assertEq(uint8(p.status), uint8(ZalaryPayrollVault.PayrollStatus.DRAFT));
        assertEq(vault.getAllocation(id1, alice).amount, A_AMT);
        assertEq(vault.getAllocation(id1, bob).amount, B_AMT);
        address[] memory emps = vault.getPayrollEmployees(id1);
        assertEq(emps.length, 2);
        assertEq(emps[0], alice);
        assertEq(emps[1], bob);
        // no escrow, no claimable credit, no open payrolls
        assertEq(vault.totalEscrowed(), 0);
        assertEq(vault.getClaimableBalance(alice), 0);
        assertEq(vault.openPayrollCount(alice), 0);
        assertEq(usdc.balanceOf(address(vault)), 0);
    }

    function test_CreateDraft_EmitsEvent() public {
        (address[] memory e, uint256[] memory m) = _arr2(alice, A_AMT, bob, B_AMT);
        uint64 dl = uint64(block.timestamp + WEEK);
        vm.prank(hr);
        vm.expectEmit(true, true, false, true, address(vault));
        emit ZalaryPayrollVault.PayrollDraftCreated(id1, hr, SIMPLE_TOTAL, 2, dl);
        vault.createPayrollDraft(id1, dl, e, m, SIMPLE_TOTAL);
    }

    function test_CreateDraft_RevertsZeroId() public {
        (address[] memory e, uint256[] memory m) = _arr(alice, 10e6);
        vm.prank(hr);
        vm.expectRevert(ZalaryPayrollVault.InvalidPayrollId.selector);
        vault.createPayrollDraft(bytes32(0), uint64(block.timestamp + WEEK), e, m, 10e6);
    }

    function test_CreateDraft_RevertsDuplicateId() public {
        _draftSimple(id1);
        (address[] memory e, uint256[] memory m) = _arr(alice, 10e6);
        vm.prank(hr);
        vm.expectRevert(abi.encodeWithSelector(ZalaryPayrollVault.PayrollAlreadyExists.selector, id1));
        vault.createPayrollDraft(id1, uint64(block.timestamp + WEEK), e, m, 10e6);
    }

    function test_CreateDraft_RevertsDeadlineNotFuture() public {
        (address[] memory e, uint256[] memory m) = _arr(alice, 10e6);
        vm.prank(hr);
        vm.expectRevert(ZalaryPayrollVault.InvalidDeadline.selector);
        vault.createPayrollDraft(id1, uint64(block.timestamp), e, m, 10e6);
    }

    function test_CreateDraft_RevertsEmptyEmployees() public {
        address[] memory e = new address[](0);
        uint256[] memory m = new uint256[](0);
        vm.prank(hr);
        vm.expectRevert(ZalaryPayrollVault.EmptyEmployees.selector);
        vault.createPayrollDraft(id1, uint64(block.timestamp + WEEK), e, m, 10e6);
    }

    function test_CreateDraft_RevertsTooManyEmployees() public {
        address[] memory e = new address[](201);
        uint256[] memory m = new uint256[](201);
        for (uint256 i; i < 201; ++i) {
            e[i] = address(uint160(0x1000 + i));
            m[i] = 1e6;
        }
        vm.prank(hr);
        vm.expectRevert(abi.encodeWithSelector(ZalaryPayrollVault.TooManyEmployees.selector, 201, 200));
        vault.createPayrollDraft(id1, uint64(block.timestamp + WEEK), e, m, 201e6);
    }

    function test_CreateDraft_AcceptsMaxEmployees() public {
        address[] memory e = new address[](200);
        uint256[] memory m = new uint256[](200);
        for (uint256 i; i < 200; ++i) {
            e[i] = address(uint160(0x1000 + i));
            m[i] = 1e6;
        }
        _draft(id1, e, m);
        assertEq(vault.getPayroll(id1).employeeCount, 200);
    }

    function test_CreateDraft_RevertsLengthMismatch() public {
        address[] memory e = new address[](2);
        e[0] = alice;
        e[1] = bob;
        uint256[] memory m = new uint256[](1);
        m[0] = 10e6;
        vm.prank(hr);
        vm.expectRevert(ZalaryPayrollVault.LengthMismatch.selector);
        vault.createPayrollDraft(id1, uint64(block.timestamp + WEEK), e, m, 10e6);
    }

    function test_CreateDraft_RevertsZeroTotal() public {
        (address[] memory e, uint256[] memory m) = _arr(alice, 10e6);
        vm.prank(hr);
        vm.expectRevert(ZalaryPayrollVault.ZeroAmount.selector);
        vault.createPayrollDraft(id1, uint64(block.timestamp + WEEK), e, m, 0);
    }

    function test_CreateDraft_RevertsZeroEmployeeAddress() public {
        (address[] memory e, uint256[] memory m) = _arr(address(0), 10e6);
        vm.prank(hr);
        vm.expectRevert(ZalaryPayrollVault.ZeroAddress.selector);
        vault.createPayrollDraft(id1, uint64(block.timestamp + WEEK), e, m, 10e6);
    }

    function test_CreateDraft_RevertsZeroEmployeeAmount() public {
        (address[] memory e, uint256[] memory m) = _arr2(alice, 10e6, bob, 0);
        vm.prank(hr);
        vm.expectRevert(ZalaryPayrollVault.ZeroAmount.selector);
        vault.createPayrollDraft(id1, uint64(block.timestamp + WEEK), e, m, 10e6);
    }

    function test_CreateDraft_RevertsDuplicateEmployee() public {
        (address[] memory e, uint256[] memory m) = _arr2(alice, 10e6, alice, 5e6);
        vm.prank(hr);
        vm.expectRevert(abi.encodeWithSelector(ZalaryPayrollVault.DuplicateEmployee.selector, alice));
        vault.createPayrollDraft(id1, uint64(block.timestamp + WEEK), e, m, 15e6);
    }

    function test_CreateDraft_RevertsTotalMismatch() public {
        (address[] memory e, uint256[] memory m) = _arr2(alice, 10e6, bob, 5e6);
        vm.prank(hr);
        vm.expectRevert(abi.encodeWithSelector(ZalaryPayrollVault.TotalAmountMismatch.selector, 14e6, 15e6));
        vault.createPayrollDraft(id1, uint64(block.timestamp + WEEK), e, m, 14e6);
    }

    function test_CreateDraft_RevertsWhenPaused() public {
        vm.prank(admin);
        vault.pause();
        (address[] memory e, uint256[] memory m) = _arr(alice, 10e6);
        vm.prank(hr);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vault.createPayrollDraft(id1, uint64(block.timestamp + WEEK), e, m, 10e6);
    }

    // ----------------------------------------------------------------- cancel

    function test_Cancel_ByHr() public {
        _draftSimple(id1);
        vm.prank(hr);
        vm.expectEmit(true, false, false, false, address(vault));
        emit ZalaryPayrollVault.PayrollDraftCancelled(id1);
        vault.cancelPayrollDraft(id1);
        assertEq(uint8(_status(id1)), uint8(ZalaryPayrollVault.PayrollStatus.CANCELLED));
    }

    function test_Cancel_ByFinance() public {
        _draftSimple(id1);
        vm.prank(fin);
        vault.cancelPayrollDraft(id1);
        assertEq(uint8(_status(id1)), uint8(ZalaryPayrollVault.PayrollStatus.CANCELLED));
    }

    function test_Cancel_RevertsForAdminAndRando() public {
        _draftSimple(id1);
        vm.prank(admin);
        vm.expectRevert(ZalaryPayrollVault.NotHRorFinance.selector);
        vault.cancelPayrollDraft(id1);
        vm.prank(rando);
        vm.expectRevert(ZalaryPayrollVault.NotHRorFinance.selector);
        vault.cancelPayrollDraft(id1);
    }

    function test_Cancel_RevertsWhenFunded() public {
        _fundedSimple(id1);
        vm.prank(hr);
        vm.expectRevert(
            abi.encodeWithSelector(
                ZalaryPayrollVault.InvalidPayrollStatus.selector, id1, ZalaryPayrollVault.PayrollStatus.FUNDED
            )
        );
        vault.cancelPayrollDraft(id1);
    }

    function test_Cancel_RevertsWhenAlreadyCancelled() public {
        _draftSimple(id1);
        vm.prank(hr);
        vault.cancelPayrollDraft(id1);
        vm.prank(fin);
        vm.expectRevert(
            abi.encodeWithSelector(
                ZalaryPayrollVault.InvalidPayrollStatus.selector, id1, ZalaryPayrollVault.PayrollStatus.CANCELLED
            )
        );
        vault.cancelPayrollDraft(id1);
    }

    function test_Cancel_RevertsUnknownPayroll() public {
        vm.prank(hr);
        vm.expectRevert(abi.encodeWithSelector(ZalaryPayrollVault.PayrollNotFound.selector, id1));
        vault.cancelPayrollDraft(id1);
    }

    function test_Cancel_AllowedWhilePaused() public {
        _draftSimple(id1);
        vm.prank(admin);
        vault.pause();
        vm.prank(hr);
        vault.cancelPayrollDraft(id1);
        assertEq(uint8(_status(id1)), uint8(ZalaryPayrollVault.PayrollStatus.CANCELLED));
    }

    function test_Cancel_IdNotReusableAndCannotBeFunded() public {
        _draftSimple(id1);
        vm.prank(hr);
        vault.cancelPayrollDraft(id1);
        (address[] memory e, uint256[] memory m) = _arr(alice, 10e6);
        vm.prank(hr);
        vm.expectRevert(abi.encodeWithSelector(ZalaryPayrollVault.PayrollAlreadyExists.selector, id1));
        vault.createPayrollDraft(id1, uint64(block.timestamp + WEEK), e, m, 10e6);

        vm.prank(fin);
        vm.expectRevert(
            abi.encodeWithSelector(
                ZalaryPayrollVault.InvalidPayrollStatus.selector, id1, ZalaryPayrollVault.PayrollStatus.CANCELLED
            )
        );
        vault.fundPayroll(id1);
    }
}
