// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ZalaryCompanyFactory} from "../ZalaryCompanyFactory.sol";
import {ZalaryPayrollVault} from "../ZalaryPayrollVault.sol";
import {MockERC20} from "../test-helpers/MockERC20.sol";

contract ZalaryCompanyFactoryTest is Test {
    ZalaryCompanyFactory internal factory;
    MockERC20 internal usdc;

    address internal creatorA = makeAddr("creatorA");
    address internal creatorB = makeAddr("creatorB");
    address internal feeRec = makeAddr("feeRec");

    uint48 internal constant DELAY = 2 days;
    uint256 internal constant FEE = 150;

    function setUp() public {
        usdc = new MockERC20("Mock USDC", "mUSDC", 6);
        factory = new ZalaryCompanyFactory(address(usdc));
    }

    function _create(address who, string memory name) internal returns (uint256 id, address vault) {
        vm.prank(who);
        (id, vault) = factory.createCompany(name, DELAY, feeRec, FEE);
    }

    function _make(address who, uint256 n) internal {
        for (uint256 i; i < n; ++i) {
            _create(who, "Co");
        }
    }

    // ------------------------------------------------------------ constructor

    function test_Constructor_StoresUsdc() public view {
        assertEq(factory.USDC(), address(usdc));
        assertEq(factory.companyCount(), 0);
    }

    function test_Constructor_ZeroUsdcReverts() public {
        vm.expectRevert(ZalaryCompanyFactory.ZeroAddress.selector);
        new ZalaryCompanyFactory(address(0));
    }

    // ------------------------------------------------------------ createCompany

    function test_CreateCompany_DeploysVaultWithExpectedConfig() public {
        (uint256 id, address v) = _create(creatorA, "Acme");
        assertEq(id, 0);
        assertGt(v.code.length, 0);
        ZalaryPayrollVault vault = ZalaryPayrollVault(v);

        assertTrue(vault.hasRole(vault.DEFAULT_ADMIN_ROLE(), creatorA));
        assertEq(vault.defaultAdmin(), creatorA);
        assertFalse(vault.hasRole(vault.PAUSER_ROLE(), creatorA)); // admin pauses via DEFAULT_ADMIN_ROLE
        assertFalse(vault.hasRole(vault.HR_ROLE(), creatorA));
        assertFalse(vault.hasRole(vault.FINANCE_ROLE(), creatorA));
        assertFalse(vault.hasRole(vault.RELAYER_ROLE(), creatorA));

        assertEq(address(vault.USDC()), address(usdc));
        assertEq(vault.feeRecipient(), feeRec);
        assertEq(vault.feeBps(), FEE);
        assertEq(vault.defaultAdminDelay(), DELAY);
    }

    function test_CreateCompany_EmitsCompanyCreated() public {
        address predicted = vm.computeCreateAddress(address(factory), vm.getNonce(address(factory)));
        vm.expectEmit(true, true, true, true, address(factory));
        emit ZalaryCompanyFactory.CompanyCreated(0, predicted, creatorA, "Acme");
        (, address v) = _create(creatorA, "Acme");
        assertEq(v, predicted);
    }

    function test_CreateCompany_StoresRecord() public {
        vm.warp(1_700_000_000);
        (uint256 id, address v) = _create(creatorA, "Acme Inc");
        ZalaryCompanyFactory.Company memory c = factory.getCompany(id);
        assertEq(c.vault, v);
        assertEq(c.creator, creatorA);
        assertEq(c.createdAt, 1_700_000_000);
        assertEq(c.name, "Acme Inc");
        assertEq(factory.companyCount(), 1);
    }

    function test_CreateCompany_NameLength0Reverts() public {
        vm.prank(creatorA);
        vm.expectRevert(abi.encodeWithSelector(ZalaryCompanyFactory.InvalidNameLength.selector, 0));
        factory.createCompany("", DELAY, feeRec, FEE);
    }

    function test_CreateCompany_NameLength65Reverts() public {
        string memory name = string(new bytes(65));
        vm.prank(creatorA);
        vm.expectRevert(abi.encodeWithSelector(ZalaryCompanyFactory.InvalidNameLength.selector, 65));
        factory.createCompany(name, DELAY, feeRec, FEE);
    }

    function test_CreateCompany_NameLength64And1Ok() public {
        bytes memory b = new bytes(64);
        for (uint256 i; i < 64; ++i) {
            b[i] = "a";
        }
        (uint256 id,) = _create(creatorA, string(b));
        assertEq(bytes(factory.getCompany(id).name).length, 64);
        (uint256 id2,) = _create(creatorA, "x");
        assertEq(id2, 1);
    }

    function test_CreateCompany_ZeroFeeRecipientReverts() public {
        vm.prank(creatorA);
        vm.expectRevert(ZalaryPayrollVault.ZeroAddress.selector);
        factory.createCompany("Acme", DELAY, address(0), FEE);
        assertEq(factory.companyCount(), 0);
    }

    function test_CreateCompany_FeeTooHighReverts() public {
        vm.prank(creatorA);
        vm.expectRevert(abi.encodeWithSelector(ZalaryPayrollVault.FeeTooHigh.selector, 501, 500));
        factory.createCompany("Acme", DELAY, feeRec, 501);
        assertEq(factory.companyCount(), 0);
    }

    function test_CreateCompany_MaxFee500Ok() public {
        vm.prank(creatorA);
        (, address v) = factory.createCompany("Acme", DELAY, feeRec, 500);
        assertEq(ZalaryPayrollVault(v).feeBps(), 500);
    }

    function test_CreateCompany_TwoCreatorsIndependent() public {
        (uint256 idA, address vA) = _create(creatorA, "A");
        (uint256 idB, address vB) = _create(creatorB, "B");
        assertEq(idA, 0);
        assertEq(idB, 1);
        assertTrue(vA != vB);
        ZalaryPayrollVault a = ZalaryPayrollVault(vA);
        ZalaryPayrollVault b = ZalaryPayrollVault(vB);
        assertTrue(a.hasRole(0x00, creatorA));
        assertFalse(a.hasRole(0x00, creatorB));
        assertTrue(b.hasRole(0x00, creatorB));
        assertFalse(b.hasRole(0x00, creatorA));
        assertEq(factory.getCompany(1).creator, creatorB);
    }

    function test_CreateCompany_OneCreatorManyCompanies() public {
        _make(creatorA, 5);
        assertEq(factory.companyCount(), 5);
        assertEq(factory.companyCountOf(creatorA), 5);
        address prev;
        for (uint256 i; i < 5; ++i) {
            ZalaryCompanyFactory.Company memory c = factory.getCompany(i);
            assertEq(c.creator, creatorA);
            assertTrue(c.vault != prev);
            prev = c.vault;
            assertTrue(ZalaryPayrollVault(c.vault).hasRole(0x00, creatorA));
        }
    }

    function test_Factory_HoldsNoRolesAndNoFunds() public {
        (, address v) = _create(creatorA, "A");
        ZalaryPayrollVault vault = ZalaryPayrollVault(v);
        bytes32[5] memory roles = [
            vault.DEFAULT_ADMIN_ROLE(),
            vault.HR_ROLE(),
            vault.FINANCE_ROLE(),
            vault.RELAYER_ROLE(),
            vault.PAUSER_ROLE()
        ];
        for (uint256 i; i < roles.length; ++i) {
            assertFalse(vault.hasRole(roles[i], address(factory)));
        }
        assertEq(vault.defaultAdmin(), creatorA);
        assertEq(usdc.balanceOf(address(factory)), 0);
        assertEq(address(factory).balance, 0);
        assertEq(usdc.balanceOf(v), 0);
    }

    // ------------------------------------------------------------ views

    function test_GetCompany_NotFoundReverts() public {
        vm.expectRevert(abi.encodeWithSelector(ZalaryCompanyFactory.CompanyNotFound.selector, 0));
        factory.getCompany(0);
        _make(creatorA, 2);
        vm.expectRevert(abi.encodeWithSelector(ZalaryCompanyFactory.CompanyNotFound.selector, 2));
        factory.getCompany(2);
        factory.getCompany(1);
    }

    function test_CompanyCount_Increments() public {
        assertEq(factory.companyCount(), 0);
        _create(creatorA, "A");
        assertEq(factory.companyCount(), 1);
        _create(creatorB, "B");
        assertEq(factory.companyCount(), 2);
    }

    function test_GetCompanies_Paging() public {
        _make(creatorA, 5);
        ZalaryCompanyFactory.Company[] memory p = factory.getCompanies(1, 2);
        assertEq(p.length, 2);
        assertEq(p[0].vault, factory.getCompany(1).vault);
        assertEq(p[1].vault, factory.getCompany(2).vault);
        // all
        assertEq(factory.getCompanies(0, 5).length, 5);
        // remaining clamp
        p = factory.getCompanies(3, 50);
        assertEq(p.length, 2);
        assertEq(p[1].vault, factory.getCompany(4).vault);
        // limit zero
        assertEq(factory.getCompanies(0, 0).length, 0);
    }

    function test_GetCompanies_OffsetBeyondCountEmpty() public {
        assertEq(factory.getCompanies(0, 10).length, 0);
        _make(creatorA, 3);
        assertEq(factory.getCompanies(3, 10).length, 0);
        assertEq(factory.getCompanies(1000, 10).length, 0);
        assertEq(factory.getCompanies(type(uint256).max, type(uint256).max).length, 0);
    }

    function test_GetCompanies_LimitCap100() public {
        _make(creatorA, 105);
        assertEq(factory.getCompanies(0, 1000).length, 100);
        assertEq(factory.getCompanies(0, type(uint256).max).length, 100);
        assertEq(factory.getCompanies(100, 1000).length, 5);
        assertEq(factory.getCompanies(0, 100).length, 100);
    }

    function test_CompanyCountOf_And_IdsOf_Paging() public {
        _create(creatorA, "a0"); // 0
        _create(creatorB, "b0"); // 1
        _create(creatorA, "a1"); // 2
        _create(creatorA, "a2"); // 3
        _create(creatorB, "b1"); // 4
        assertEq(factory.companyCountOf(creatorA), 3);
        assertEq(factory.companyCountOf(creatorB), 2);
        assertEq(factory.companyCountOf(makeAddr("nobody")), 0);

        uint256[] memory ids = factory.companyIdsOf(creatorA, 0, 10);
        assertEq(ids.length, 3);
        assertEq(ids[0], 0);
        assertEq(ids[1], 2);
        assertEq(ids[2], 3);

        ids = factory.companyIdsOf(creatorA, 1, 1);
        assertEq(ids.length, 1);
        assertEq(ids[0], 2);

        // remaining clamp
        ids = factory.companyIdsOf(creatorA, 2, 50);
        assertEq(ids.length, 1);
        assertEq(ids[0], 3);

        ids = factory.companyIdsOf(creatorB, 0, 10);
        assertEq(ids.length, 2);
        assertEq(ids[0], 1);
        assertEq(ids[1], 4);
    }

    function test_CompanyIdsOf_OffsetBeyondEmpty() public {
        _make(creatorA, 2);
        assertEq(factory.companyIdsOf(creatorA, 2, 5).length, 0);
        assertEq(factory.companyIdsOf(creatorA, 99, 5).length, 0);
        assertEq(factory.companyIdsOf(creatorB, 0, 5).length, 0);
    }

    function test_CompanyIdsOf_LimitCap100() public {
        _make(creatorA, 105);
        assertEq(factory.companyIdsOf(creatorA, 0, 500).length, 100);
        uint256[] memory tail = factory.companyIdsOf(creatorA, 100, 500);
        assertEq(tail.length, 5);
        assertEq(tail[4], 104);
    }

    // ------------------------------------------------------------ fuzz

    function testFuzz_CreateCompany_NameLength(uint256 len) public {
        len = bound(len, 0, 200);
        bytes memory b = new bytes(len);
        for (uint256 i; i < len; ++i) {
            b[i] = "n";
        }
        vm.prank(creatorA);
        if (len == 0 || len > 64) {
            vm.expectRevert(abi.encodeWithSelector(ZalaryCompanyFactory.InvalidNameLength.selector, len));
            factory.createCompany(string(b), DELAY, feeRec, FEE);
        } else {
            factory.createCompany(string(b), DELAY, feeRec, FEE);
            assertEq(factory.companyCount(), 1);
        }
    }

    function testFuzz_CreateCompany_FeeBps(uint256 bps) public {
        vm.prank(creatorA);
        if (bps > 500) {
            vm.expectRevert(abi.encodeWithSelector(ZalaryPayrollVault.FeeTooHigh.selector, bps, 500));
            factory.createCompany("A", DELAY, feeRec, bps);
        } else {
            (, address v) = factory.createCompany("A", DELAY, feeRec, bps);
            assertEq(ZalaryPayrollVault(v).feeBps(), bps);
        }
    }
}
