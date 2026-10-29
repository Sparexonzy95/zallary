// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ZalaryPayrollVault} from "./ZalaryPayrollVault.sol";

/// @title ZalaryCompanyFactory
/// @notice Permissionless registry deploying an independent payroll vault for each company.
/// @dev Has no owner, admin powers, or upgradeability and receives no roles in any vault.
/// Each creator becomes its vault's DEFAULT_ADMIN_ROLE holder and initial pauser.
/// The factory never takes custody of funds; it has no payable entry points or token-transfer logic.
/// Unsolicited token transfers or forcibly sent native currency cannot be prevented or recovered.
contract ZalaryCompanyFactory {
    /// @notice Immutable USDC token address supplied to every deployed vault.
    address public immutable USDC;

    /// @notice Company metadata recorded at creation and never modified.
    struct Company {
        /// @notice Address of the company's independently deployed payroll vault.
        address vault;
        /// @notice Wallet that created the company and initially administers its vault.
        address creator;
        /// @notice Creation timestamp in seconds since the Unix epoch.
        uint64 createdAt;
        /// @notice Company name, containing between 1 and 64 bytes.
        string name;
    }

    /// @dev Companies in creation order; array indices are zero-based company IDs.
    Company[] private _companies;
    /// @dev Company IDs in creation order for each creator.
    mapping(address => uint256[]) private _companyIds;

    /// @notice The USDC token address cannot be zero.
    error ZeroAddress();
    /// @notice The company name must contain between 1 and 64 bytes.
    /// @param length Supplied name length in bytes.
    error InvalidNameLength(uint256 length);
    /// @notice No company exists for the supplied ID.
    /// @param id Requested company ID.
    error CompanyNotFound(uint256 id);

    /// @notice Emitted after a company and its independent vault are created.
    /// @param id Zero-based company ID.
    /// @param vault Address of the newly deployed payroll vault.
    /// @param creator Wallet that created the company and initially administers its vault.
    /// @param name Company name.
    event CompanyCreated(uint256 indexed id, address indexed vault, address indexed creator, string name);

    /// @notice Sets the immutable USDC address used for all company vaults.
    /// @param usdc Nonzero USDC token address.
    constructor(address usdc) {
        if (usdc == address(0)) revert ZeroAddress();
        USDC = usdc;
    }

    /// @notice Creates a company and deploys its vault with the caller as initial default admin.
    /// @dev Fee recipient and fee rate validation is delegated to the vault constructor.
    /// The factory receives neither funds nor vault roles.
    /// @param name Company name, between 1 and 64 bytes inclusive.
    /// @param adminDelay Delay in seconds for vault default-administrator handover.
    /// @param feeRecipient Initial recipient of the vault's protocol fees.
    /// @param feeBps Initial protocol fee in basis points.
    /// @return id Zero-based ID of the newly registered company.
    /// @return vault Address of the newly deployed payroll vault.
    function createCompany(string calldata name, uint48 adminDelay, address feeRecipient, uint256 feeBps)
        external returns (uint256 id, address vault)
    {
        uint256 length = bytes(name).length;
        if (length == 0 || length > 64) revert InvalidNameLength(length);

        vault = address(new ZalaryPayrollVault(USDC, msg.sender, adminDelay, feeRecipient, feeBps));
        id = _companies.length;
        _companies.push(Company({
            vault: vault,
            creator: msg.sender,
            createdAt: uint64(block.timestamp),
            name: name
        }));
        _companyIds[msg.sender].push(id);
        emit CompanyCreated(id, vault, msg.sender, name);
    }

    /// @notice Returns the total number of registered companies.
    /// @return count Number of companies, including all creators.
    function companyCount() external view returns (uint256 count) {
        return _companies.length;
    }

    /// @notice Returns company metadata, reverting if the ID does not exist.
    /// @param id Zero-based company ID.
    /// @return company Stored company metadata.
    function getCompany(uint256 id) external view returns (Company memory company) {
        if (id >= _companies.length) revert CompanyNotFound(id);
        return _companies[id];
    }

    /// @notice Returns a page of companies in creation order.
    /// @param offset Zero-based starting company ID.
    /// @param limit Maximum companies to return, capped at 100 and the remaining count.
    /// @return companies Company metadata, or an empty array when offset is out of range.
    function getCompanies(uint256 offset, uint256 limit) external view returns (Company[] memory companies) {
        uint256 count = _companies.length;
        if (offset >= count) return new Company[](0);
        if (limit > 100) limit = 100;
        uint256 remaining = count - offset;
        if (limit > remaining) limit = remaining;
        companies = new Company[](limit);
        for (uint256 i = 0; i < limit; ++i) {
            companies[i] = _companies[offset + i];
        }
    }

    /// @notice Returns how many companies a creator has registered.
    /// @param creator Wallet whose company count is requested.
    /// @return count Number of companies created by the wallet.
    function companyCountOf(address creator) external view returns (uint256 count) {
        return _companyIds[creator].length;
    }

    /// @notice Returns a page of company IDs registered by a creator, in creation order.
    /// @param creator Wallet whose company IDs are requested.
    /// @param offset Zero-based starting index in the creator's list.
    /// @param limit Maximum IDs to return, capped at 100 and the remaining count.
    /// @return ids Company IDs, or an empty array when offset is out of range.
    function companyIdsOf(address creator, uint256 offset, uint256 limit) external view returns (uint256[] memory ids) {
        uint256[] storage all = _companyIds[creator];
        uint256 count = all.length;
        if (offset >= count) return new uint256[](0);
        if (limit > 100) limit = 100;
        uint256 remaining = count - offset;
        if (limit > remaining) limit = remaining;
        ids = new uint256[](limit);
        for (uint256 i = 0; i < limit; ++i) {
            ids[i] = all[offset + i];
        }
    }
}
