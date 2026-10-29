// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControlDefaultAdminRules} from "@openzeppelin/contracts/access/extensions/AccessControlDefaultAdminRules.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/// @title ZalaryPayrollVault
/// @notice Institutional pull-payment payroll escrow using the ERC-20 interface to USDC.
/// Separate approval is off by default: Finance may fund any draft, including its own.
/// The admin can require a different Finance account to fund each draft via fundPayroll;
/// dual-role fundPayrollDirect remains exempt.
/// @dev Amounts are raw six-decimal USDC units. Requires the canonical, non-fee-on-transfer
/// USDC implementation. No native-currency interface is used. Claims remain available
/// after expiry until Finance refunds the allocation. At transaction boundaries,
/// USDC balance covers totalEscrowed, which equals all FUNDED remainingEscrow balances.
/// @dev Directly deployed, NOT upgradeable, and must not be used behind a proxy:
/// admin/token configuration and immutables are constructor-initialised.
/// @custom:upgrade-strategy Direct deployment only; no proxy or upgrade mechanism.
/// @custom:security All escrow sits at the vault address. If the USDC issuer blocklists
/// the vault address, claims and refunds revert and no on-chain function can override it.
/// Operators should monitor and maintain a recovery procedure with the issuer;
/// one vault per institution limits the blast radius.
contract ZalaryPayrollVault is AccessControlDefaultAdminRules, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using EnumerableSet for EnumerableSet.AddressSet;

    /// @notice Role permitted to prepare payrolls.
    bytes32 public constant HR_ROLE = keccak256("HR_ROLE");
    /// @notice Role permitted to fund payrolls and refund expired allocations.
    bytes32 public constant FINANCE_ROLE = keccak256("FINANCE_ROLE");
    /// @notice Role permitted to trigger claims on behalf of employees.
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");
    /// @notice Role permitted to pause and unpause operations.
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    /// @notice Maximum protocol fee in basis points (5%).
    uint256 public constant MAX_FEE_BPS = 500;
    /// @notice Maximum allocations in one payroll.
    uint256 public constant MAX_EMPLOYEES_PER_PAYROLL = 200;
    /// @notice Maximum payroll allocations processed by an aggregate claim.
    uint256 public constant MAX_CLAIM_BATCH = 50;

    /// @notice Payroll lifecycle; terminal status reflects the last settlement operation.
    enum PayrollStatus { DRAFT, FUNDED, COMPLETED, REFUNDED, CANCELLED }

    /// @notice One immutable salary amount and its mutually exclusive settlement flags.
    struct Allocation {
        /// @notice Salary in raw USDC units.
        uint256 amount;
        /// @notice Whether the employee has received the salary.
        bool claimed;
        /// @notice Whether the employer has received the expired salary back.
        bool refunded;
    }

    /// @notice Payroll metadata, accounting, and lifecycle.
    struct PayrollMeta {
        /// @notice Funding wallet and refund recipient; zero before funding.
        address employer;
        /// @notice HR account that prepared the payroll.
        address createdByHR;
        /// @notice Finance account that funded the payroll; zero before funding.
        address fundedByFinance;
        /// @notice Last timestamp before expiry; claims are not restricted by this timestamp.
        uint64 deadline;
        /// @notice Number of distinct employees.
        uint32 employeeCount;
        /// @notice Committed salary total, recorded even while in draft.
        uint256 totalFunded;
        /// @notice Salary escrow still awaiting claim or refund.
        uint256 remainingEscrow;
        /// @notice Protocol fee actually charged at funding.
        uint256 protocolFeePaid;
        /// @notice Current lifecycle state.
        PayrollStatus status;
        /// @notice Distinguishes a stored payroll from an unused identifier.
        bool exists;
    }

    /// @notice Fixed USDC ERC-20 interface.
    IERC20 public immutable USDC;
    /// @notice Fee rate applied to future funding, in basis points.
    uint256 public feeBps;
    /// @notice Recipient of fees on future funding.
    address public feeRecipient;
    /// @notice Cumulative fees forwarded to fee recipients.
    uint256 public totalProtocolFeesCollected;
    /// @notice Sum of remainingEscrow across all FUNDED payrolls.
    uint256 public totalEscrowed;
    /// @notice Payroll metadata by unique identifier.
    mapping(bytes32 => PayrollMeta) public payrolls;
    /// @notice Salary allocations by payroll and employee.
    mapping(bytes32 => mapping(address => Allocation)) public allocations;
    /// @notice Total unclaimed, unrefunded funded salary for each employee.
    mapping(address => uint256) public claimableBalance;
    /// @notice Cumulative salary paid to each employee.
    mapping(address => uint256) public totalClaimed;
    /// @dev Immutable employee list for each payroll, retained after settlement.
    mapping(bytes32 => address[]) private _payrollEmployees;
    /// @dev Contains exactly the employee's unclaimed, unrefunded FUNDED allocations.
    mapping(address => EnumerableSet.Bytes32Set) private _openPayrolls;
    /// @dev All payroll identifiers in creation order, retained after cancellation or settlement.
    bytes32[] private _payrollIds;
    /// @dev Current members of each role, including constructor grants and default-admin transfers.
    mapping(bytes32 => EnumerableSet.AddressSet) private _roleMembers;
    /// @notice Whether standard draft funding requires a Finance account other than its creator; off by default.
    bool public requireSeparateApprover;

    /// @notice A required address was zero.
    error ZeroAddress();
    /// @notice A required amount was zero.
    error ZeroAmount();
    /// @notice Fee exceeds the protocol cap.
    error FeeTooHigh(uint256 supplied, uint256 maximum);
    /// @notice Caller does not have the HR role.
    error NotHR();
    /// @notice Caller does not have the Finance role.
    error NotFinance();
    /// @notice Caller holds neither HR nor Finance role.
    error NotHRorFinance();
    /// @notice Caller is neither the employee nor an authorized relayer.
    error NotEmployeeOrRelayer();
    /// @notice The zero payroll identifier is forbidden.
    error InvalidPayrollId();
    /// @notice The payroll identifier has already been used, including cancelled payrolls.
    error PayrollAlreadyExists(bytes32 payrollId);
    /// @notice The payroll does not exist.
    error PayrollNotFound(bytes32 payrollId);
    /// @notice The requested operation is incompatible with the payroll status.
    error InvalidPayrollStatus(bytes32 payrollId, PayrollStatus current);
    /// @notice The deadline is not strictly in the future.
    error InvalidDeadline();
    /// @notice No employees were supplied.
    error EmptyEmployees();
    /// @notice Employee count exceeds the per-payroll cap.
    error TooManyEmployees(uint256 supplied, uint256 maximum);
    /// @notice Employee and amount arrays differ in length.
    error LengthMismatch();
    /// @notice An employee appears more than once in a payroll.
    error DuplicateEmployee(address employee);
    /// @notice The allocation sum differs from the declared total.
    error TotalAmountMismatch(uint256 supplied, uint256 computed);
    /// @notice A draft creator cannot approve funding on the standard funding path.
    error SelfApprovalNotAllowed();
    /// @notice Refunds require a timestamp strictly greater than the deadline.
    error PayrollNotExpired(bytes32 payrollId, uint64 deadline);
    /// @notice No allocation exists for the employee in this payroll.
    error AllocationNotFound(bytes32 payrollId, address employee);
    /// @notice The allocation has already been paid to the employee.
    error AlreadyClaimed(bytes32 payrollId, address employee);
    /// @notice The allocation has already been refunded to the employer.
    error AlreadyRefunded(bytes32 payrollId, address employee);
    /// @notice There are no open allocations to claim.
    error NoClaimableBalance();
    /// @notice A USDC rescue would exceed unencumbered surplus.
    error RescueExceedsSurplus(uint256 requested, uint256 surplus);

    /// @notice Emitted when HR creates an immutable payroll draft.
    event PayrollDraftCreated(
        bytes32 indexed payrollId, address indexed createdByHR,
        uint256 totalAmount, uint32 employeeCount, uint64 deadline
    );
    /// @notice Emitted when HR or Finance cancels an unfunded payroll.
    event PayrollDraftCancelled(bytes32 indexed payrollId);
    /// @notice Emitted when Finance funds salaries and pays the protocol fee.
    event PayrollFunded(
        bytes32 indexed payrollId, address indexed employer, uint256 total,
        uint32 employeeCount, uint64 deadline, uint256 fee
    );
    /// @notice Emitted when a protocol fee is forwarded to its recipient.
    event ProtocolFeeCollected(bytes32 indexed payrollId, address indexed feeRecipient, uint256 fee);
    /// @notice Emitted when an expired allocation is returned to its original funder.
    event LeftoverRefunded(
        bytes32 indexed payrollId, address indexed employer, address indexed employee, uint256 amount
    );
    /// @notice Emitted for each claimed allocation; claimer may be an authorized relayer.
    event PayrollSalaryClaimed(
        bytes32 indexed payrollId, address indexed employee, uint256 amount, address indexed claimer
    );
    /// @notice Emitted for the single aggregate payment made by a claim transaction.
    event SalaryClaimed(address indexed employee, uint256 amount, address indexed claimer);
    /// @notice Emitted when configuration for future funding changes.
    event ProtocolFeeUpdated(uint256 newFeeBps, address indexed newFeeRecipient);
    /// @notice Emitted when the separate draft approver requirement changes.
    event SeparateApproverUpdated(bool required);
    /// @notice Emitted for an administrative token rescue, never including salary escrow.
    event EmergencyRescue(address indexed token, address indexed to, uint256 amount);

    /// @dev Restricts entry to an HR member using the vault-specific error.
    modifier onlyHR() {
        if (!hasRole(HR_ROLE, msg.sender)) revert NotHR();
        _;
    }

    /// @dev Restricts entry to a Finance member using the vault-specific error.
    modifier onlyFinance() {
        if (!hasRole(FINANCE_ROLE, msg.sender)) revert NotFinance();
        _;
    }

    /// @notice Initializes the fixed token, delayed administrator, pauser, and fee configuration.
    /// @param usdc Canonical USDC ERC-20 address (six decimals).
    /// @param admin Initial administrator; receives PAUSER_ROLE but not HR or Finance.
    /// @param adminDelay Delay in seconds for default-administrator handover.
    /// @param feeRecipient_ Initial recipient of protocol fees.
    /// @param feeBps_ Initial protocol fee in basis points, capped at 500.
    constructor(address usdc, address admin, uint48 adminDelay, address feeRecipient_, uint256 feeBps_)
        AccessControlDefaultAdminRules(adminDelay, _requireNonZero(admin))
    {
        if (usdc == address(0) || feeRecipient_ == address(0)) revert ZeroAddress();
        if (feeBps_ > MAX_FEE_BPS) revert FeeTooHigh(feeBps_, MAX_FEE_BPS);
        USDC = IERC20(usdc);
        feeRecipient = feeRecipient_;
        feeBps = feeBps_;
        _grantRole(PAUSER_ROLE, admin);
    }

    /// @notice Creates an immutable draft without moving tokens or crediting claimable balances.
    /// @param payrollId Unique nonzero identifier, never reusable even after cancellation.
    /// @param deadline Future expiry timestamp for Finance refunds.
    /// @param employees Distinct nonzero salary recipients, capped at 200.
    /// @param amounts Nonzero salaries in raw USDC units, parallel to employees.
    /// @param totalAmount Expected sum of all salaries, excluding fees.
    function createPayrollDraft(
        bytes32 payrollId, uint64 deadline, address[] calldata employees,
        uint256[] calldata amounts, uint256 totalAmount
    ) external onlyHR whenNotPaused {
        _createPayrollDraft(payrollId, deadline, employees, amounts, totalAmount);
    }

    /// @notice Cancels an existing draft; allowed while paused and restricted to HR or Finance.
    /// @param payrollId Identifier of the draft to cancel.
    function cancelPayrollDraft(bytes32 payrollId) external {
        if (!hasRole(HR_ROLE, msg.sender) && !hasRole(FINANCE_ROLE, msg.sender)) revert NotHRorFinance();
        PayrollMeta storage payroll = _requirePayroll(payrollId);
        if (payroll.status != PayrollStatus.DRAFT) revert InvalidPayrollStatus(payrollId, payroll.status);
        payroll.status = PayrollStatus.CANCELLED;
        emit PayrollDraftCancelled(payrollId);
    }

    /// @notice Funds a draft from the Finance caller; separate approval is off by default.
    /// By default Finance may fund any draft, including one it prepared itself.
    /// The admin can enable requireSeparateApprover so a Finance account other than the
    /// draft creator must fund each draft through this function.
    /// @dev Pulls USDC from msg.sender (the Finance wallet). Finance should approve the vault
    /// only for the exact reviewed total+fee; the allowance is the natural bound if the fee
    /// changes before funding. Refunds go to the wallet that funded the payroll.
    /// @param payrollId Identifier of the draft to fund.
    function fundPayroll(bytes32 payrollId) external onlyFinance nonReentrant whenNotPaused {
        _fundPayroll(payrollId, false);
    }

    /// @notice Creates and funds a payroll atomically, exclusively for deliberately dual-role accounts.
    /// @dev Subject to the same `requireSeparateApprover` policy as `fundPayroll`: when the admin enables it, this
    /// atomic path reverts because the caller would approve its own payroll.
    /// @param payrollId Unique nonzero payroll identifier.
    /// @param deadline Future refund-expiry timestamp.
    /// @param employees Distinct nonzero employee addresses.
    /// @param amounts Nonzero raw USDC salaries parallel to employees.
    /// @param totalAmount Expected salary sum, excluding fees.
    function fundPayrollDirect(
        bytes32 payrollId, uint64 deadline, address[] calldata employees,
        uint256[] calldata amounts, uint256 totalAmount
    ) external onlyFinance nonReentrant whenNotPaused {
        if (!hasRole(HR_ROLE, msg.sender)) revert NotHR();
        _createPayrollDraft(payrollId, deadline, employees, amounts, totalAmount);
        _fundPayroll(payrollId, false);
    }

    /// @notice Refunds one expired, unpaid allocation to its original funding wallet.
    /// @param payrollId Funded payroll identifier.
    /// @param employee Employee whose unpaid allocation should be refunded.
    function refundLeftover(bytes32 payrollId, address employee)
        external onlyFinance nonReentrant whenNotPaused
    {
        PayrollMeta storage payroll = _requirePayroll(payrollId);
        if (payroll.status != PayrollStatus.FUNDED) revert InvalidPayrollStatus(payrollId, payroll.status);
        if (block.timestamp <= payroll.deadline) revert PayrollNotExpired(payrollId, payroll.deadline);
        Allocation storage allocation = _requireUnsettledAllocation(payrollId, employee);
        uint256 amount = allocation.amount;
        allocation.refunded = true;
        claimableBalance[employee] -= amount;
        _openPayrolls[employee].remove(payrollId);
        payroll.remainingEscrow -= amount;
        totalEscrowed -= amount;
        if (payroll.remainingEscrow == 0) payroll.status = PayrollStatus.REFUNDED;
        USDC.safeTransfer(payroll.employer, amount);
        emit LeftoverRefunded(payrollId, payroll.employer, employee, amount);
    }

    /// @notice Claims up to 50 open payroll allocations to the caller's own wallet.
    /// @dev Call repeatedly when more than 50 allocations remain; expiry does not block claims.
    function claimSalary() external nonReentrant whenNotPaused {
        _claimAll(msg.sender, msg.sender);
    }

    /// @notice Lets an employee or an authorized relayer trigger a payment only to that employee.
    /// @param employee Nonzero employee whose open allocations should be claimed, up to 50.
    function claimSalaryFor(address employee) external nonReentrant whenNotPaused {
        if (employee == address(0)) revert ZeroAddress();
        if (msg.sender != employee && !hasRole(RELAYER_ROLE, msg.sender)) revert NotEmployeeOrRelayer();
        _claimAll(employee, msg.sender);
    }

    /// @notice Claims the caller's allocation from a single payroll, including after expiry.
    /// @param payrollId Funded payroll containing the caller's unpaid allocation.
    function claimPayrollSalary(bytes32 payrollId) external nonReentrant whenNotPaused {
        PayrollMeta storage payroll = _requirePayroll(payrollId);
        if (payroll.status != PayrollStatus.FUNDED) revert InvalidPayrollStatus(payrollId, payroll.status);
        Allocation storage allocation = _requireUnsettledAllocation(payrollId, msg.sender);
        uint256 amount = _settleClaim(payrollId, msg.sender, msg.sender, payroll, allocation);
        claimableBalance[msg.sender] -= amount;
        totalClaimed[msg.sender] += amount;
        USDC.safeTransfer(msg.sender, amount);
        emit SalaryClaimed(msg.sender, amount, msg.sender);
    }

    /// @notice Updates the fee rate and recipient for future funding only.
    /// @param newFeeBps New basis-point rate, at most 500.
    /// @param newFeeRecipient Nonzero recipient of future fees.
    function setProtocolFee(uint256 newFeeBps, address newFeeRecipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newFeeBps > MAX_FEE_BPS) revert FeeTooHigh(newFeeBps, MAX_FEE_BPS);
        if (newFeeRecipient == address(0)) revert ZeroAddress();
        feeBps = newFeeBps;
        feeRecipient = newFeeRecipient;
        emit ProtocolFeeUpdated(newFeeBps, newFeeRecipient);
    }

    /// @notice Sets whether standard draft funding requires a separate Finance approver.
    /// @param required Whether the funding account must differ from the draft creator.
    function setRequireSeparateApprover(bool required) external onlyRole(DEFAULT_ADMIN_ROLE) {
        requireSeparateApprover = required;
        emit SeparateApproverUpdated(required);
    }

    /// @notice Pauses drafting, funding, refunds, and claims.
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /// @notice Resumes drafting, funding, refunds, and claims.
    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /// @notice Rescues unrelated ERC-20 tokens or USDC surplus, never escrowed salary.
    /// @dev Available while paused. If USDC is undercollateralized, no USDC rescue is possible.
    /// @param token Nonzero ERC-20 token address.
    /// @param to Nonzero rescue recipient.
    /// @param amount Nonzero amount in the token's base units.
    function rescueToken(address token, address to, uint256 amount)
        external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant
    {
        if (token == address(0) || to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (token == address(USDC)) {
            uint256 balance = USDC.balanceOf(address(this));
            if (balance < totalEscrowed) revert RescueExceedsSurplus(amount, 0);
            if (amount > balance - totalEscrowed) revert RescueExceedsSurplus(amount, balance - totalEscrowed);
        }
        IERC20(token).safeTransfer(to, amount);
        emit EmergencyRescue(token, to, amount);
    }

    /// @notice Quotes the current funding fee and inclusive charge for a salary amount.
    /// @param amount Raw USDC salary amount, excluding fees.
    /// @return fee Protocol fee, rounded down to a base unit.
    /// @return totalWithFee Salary plus protocol fee.
    function calculateFee(uint256 amount) public view returns (uint256 fee, uint256 totalWithFee) {
        // Splitting quotient and remainder is equivalent to amount * feeBps / 10_000
        // without overflowing the intermediate product for large salary amounts.
        fee = (amount / 10_000) * feeBps + ((amount % 10_000) * feeBps) / 10_000;
        totalWithFee = amount + fee;
    }

    /// @notice Returns payroll metadata; an unknown identifier returns exists == false.
    /// @param payrollId Payroll identifier to query.
    /// @return Payroll metadata, or the zero-initialized struct if absent.
    function getPayroll(bytes32 payrollId) external view returns (PayrollMeta memory) {
        return payrolls[payrollId];
    }

    /// @notice Returns an allocation, or a zero-initialized struct if absent.
    /// @param payrollId Payroll identifier to query.
    /// @param employee Employee address to query.
    /// @return Stored allocation.
    function getAllocation(bytes32 payrollId, address employee) external view returns (Allocation memory) {
        return allocations[payrollId][employee];
    }

    /// @notice Returns all funded salary still claimable by an employee, across all batches.
    /// @param employee Employee address to query.
    /// @return Claimable raw USDC amount.
    function getClaimableBalance(address employee) external view returns (uint256) {
        return claimableBalance[employee];
    }

    /// @notice Returns the original ordered employee list, including for settled or cancelled payrolls.
    /// @param payrollId Payroll identifier to query.
    /// @return Employee addresses, or an empty array if absent.
    function getPayrollEmployees(bytes32 payrollId) external view returns (address[] memory) {
        return _payrollEmployees[payrollId];
    }

    /// @notice Returns the number of funded allocations awaiting claim or refund for an employee.
    /// @param employee Employee address to query.
    /// @return Number of open payroll allocations.
    function openPayrollCount(address employee) external view returns (uint256) {
        return _openPayrolls[employee].length();
    }

    /// @notice Returns a page of an employee's funded allocations awaiting claim or refund.
    /// @dev Set ordering is unstable after removals; use a fixed block when reading multiple pages.
    /// @param employee Employee whose open payroll identifiers are requested.
    /// @param offset Zero-based starting index in the open payroll set.
    /// @param limit Maximum identifiers to return, capped at 100 and the remaining set length.
    /// @return ids Open payroll identifiers, or an empty array when offset is out of range.
    function getOpenPayrollIds(address employee, uint256 offset, uint256 limit)
        external view returns (bytes32[] memory ids)
    {
        EnumerableSet.Bytes32Set storage open = _openPayrolls[employee];
        uint256 length = open.length();
        if (offset >= length) return new bytes32[](0);
        if (limit > 100) limit = 100;
        uint256 remaining = length - offset;
        if (limit > remaining) limit = remaining;
        ids = new bytes32[](limit);
        for (uint256 i = 0; i < limit; ++i) {
            ids[i] = open.at(offset + i);
        }
    }

    /// @notice Returns the number of payrolls ever created, including cancelled and settled payrolls.
    /// @return Number of stored payroll identifiers.
    function payrollCount() external view returns (uint256) {
        return _payrollIds.length;
    }

    /// @notice Returns a page of all payroll identifiers in creation order.
    /// @param offset Zero-based starting index in the payroll list.
    /// @param limit Maximum identifiers to return, capped at 100 and the remaining list length.
    /// @return ids Payroll identifiers, or an empty array when offset is out of range.
    function getPayrollIds(uint256 offset, uint256 limit) external view returns (bytes32[] memory ids) {
        uint256 length = _payrollIds.length;
        if (offset >= length) return new bytes32[](0);
        if (limit > 100) limit = 100;
        uint256 remaining = length - offset;
        if (limit > remaining) limit = remaining;
        ids = new bytes32[](limit);
        for (uint256 i = 0; i < limit; ++i) {
            ids[i] = _payrollIds[offset + i];
        }
    }

    /// @notice Returns the number of current members of a role, including DEFAULT_ADMIN_ROLE.
    /// @param role Role identifier.
    /// @return Number of accounts holding the role.
    function roleMemberCount(bytes32 role) external view returns (uint256) {
        return _roleMembers[role].length();
    }

    /// @notice Returns a page of current members of a role, including DEFAULT_ADMIN_ROLE.
    /// @dev Set ordering is unstable after removals; use a fixed block when reading multiple pages.
    /// @param role Role identifier.
    /// @param offset Zero-based starting index in the role member set.
    /// @param limit Maximum members to return, capped at 100 and the remaining set length.
    /// @return members Role members, or an empty array when offset is out of range.
    function getRoleMembers(bytes32 role, uint256 offset, uint256 limit)
        external view returns (address[] memory members)
    {
        EnumerableSet.AddressSet storage accounts = _roleMembers[role];
        uint256 length = accounts.length();
        if (offset >= length) return new address[](0);
        if (limit > 100) limit = 100;
        uint256 remaining = length - offset;
        if (limit > remaining) limit = remaining;
        members = new address[](limit);
        for (uint256 i = 0; i < limit; ++i) {
            members[i] = accounts.at(offset + i);
        }
    }

    /// @notice Tests membership in a role, including DEFAULT_ADMIN_ROLE.
    /// @param role Role identifier.
    /// @param account Account to query.
    /// @return Whether the account holds the role.
    function isRoleMember(bytes32 role, address account) external view returns (bool) {
        return hasRole(role, account);
    }

    /// @dev Records successful grants after applying all inherited default-admin rules.
    /// Includes the initial constructor grants and accepted default-admin transfers.
    /// @param role Role identifier.
    /// @param account Account receiving the role.
    /// @return Whether the account was newly granted the role.
    function _grantRole(bytes32 role, address account)
        internal virtual override(AccessControlDefaultAdminRules) returns (bool)
    {
        bool granted = super._grantRole(role, account);
        if (granted) _roleMembers[role].add(account);
        return granted;
    }

    /// @dev Records successful revocations after applying all inherited default-admin rules.
    /// Includes role renunciation and accepted default-admin transfers.
    /// @param role Role identifier.
    /// @param account Account losing the role.
    /// @return Whether the account previously held the revoked role.
    function _revokeRole(bytes32 role, address account)
        internal virtual override(AccessControlDefaultAdminRules) returns (bool)
    {
        bool revoked = super._revokeRole(role, account);
        if (revoked) _roleMembers[role].remove(account);
        return revoked;
    }

    /// @dev Shared draft creation, validates all inputs and records no escrow or claimable credit.
    /// @param payrollId Unique nonzero identifier.
    /// @param deadline Strictly future expiry timestamp.
    /// @param employees Distinct nonzero employee addresses.
    /// @param amounts Nonzero salary amounts parallel to employees.
    /// @param totalAmount Expected nonzero sum of amounts.
    function _createPayrollDraft(
        bytes32 payrollId, uint64 deadline, address[] calldata employees,
        uint256[] calldata amounts, uint256 totalAmount
    ) internal {
        if (payrollId == bytes32(0)) revert InvalidPayrollId();
        if (payrolls[payrollId].exists) revert PayrollAlreadyExists(payrollId);
        if (deadline <= block.timestamp) revert InvalidDeadline();
        uint256 count = employees.length;
        if (count == 0) revert EmptyEmployees();
        if (count > MAX_EMPLOYEES_PER_PAYROLL) revert TooManyEmployees(count, MAX_EMPLOYEES_PER_PAYROLL);
        if (count != amounts.length) revert LengthMismatch();
        if (totalAmount == 0) revert ZeroAmount();
        uint256 sum;
        for (uint256 i = 0; i < count; ++i) {
            address employee = employees[i];
            uint256 amount = amounts[i];
            if (employee == address(0)) revert ZeroAddress();
            if (amount == 0) revert ZeroAmount();
            // A nonzero amount is also the uniqueness marker within this new payroll.
            if (allocations[payrollId][employee].amount != 0) revert DuplicateEmployee(employee);
            allocations[payrollId][employee] = Allocation(amount, false, false);
            _payrollEmployees[payrollId].push(employee);
            sum += amount;
        }
        if (sum != totalAmount) revert TotalAmountMismatch(totalAmount, sum);
        payrolls[payrollId] = PayrollMeta({
            employer: address(0), createdByHR: msg.sender, fundedByFinance: address(0),
            deadline: deadline, employeeCount: uint32(count), totalFunded: totalAmount,
            remainingEscrow: 0, protocolFeePaid: 0, status: PayrollStatus.DRAFT, exists: true
        });
        _payrollIds.push(payrollId);
        emit PayrollDraftCreated(payrollId, msg.sender, totalAmount, uint32(count), deadline);
    }

    /// @dev Shared funding implementation; callers supply role checks and the reentrancy guard.
    /// All effects precede token interactions; failed transfers roll the transaction back.
    /// @param payrollId Draft identifier.
    /// @param allowSelfApproval True only on the external dual-role direct-funding path.
    function _fundPayroll(bytes32 payrollId, bool allowSelfApproval) internal {
        PayrollMeta storage payroll = _requirePayroll(payrollId);
        if (payroll.status != PayrollStatus.DRAFT) revert InvalidPayrollStatus(payrollId, payroll.status);
        if (requireSeparateApprover && !allowSelfApproval && msg.sender == payroll.createdByHR) revert SelfApprovalNotAllowed();
        if (payroll.deadline <= block.timestamp) revert InvalidDeadline();
        uint256 total = payroll.totalFunded;
        (uint256 fee, uint256 charge) = calculateFee(total);
        address recipient = feeRecipient;
        payroll.employer = msg.sender;
        payroll.fundedByFinance = msg.sender;
        payroll.remainingEscrow = total;
        payroll.protocolFeePaid = fee;
        payroll.status = PayrollStatus.FUNDED;
        totalEscrowed += total;
        totalProtocolFeesCollected += fee;
        address[] storage employees = _payrollEmployees[payrollId];
        for (uint256 i = 0; i < employees.length; ++i) {
            address employee = employees[i];
            claimableBalance[employee] += allocations[payrollId][employee].amount;
            _openPayrolls[employee].add(payrollId);
        }
        USDC.safeTransferFrom(msg.sender, address(this), charge);
        if (fee > 0) {
            USDC.safeTransfer(recipient, fee);
            emit ProtocolFeeCollected(payrollId, recipient, fee);
        }
        emit PayrollFunded(payrollId, msg.sender, total, payroll.employeeCount, payroll.deadline, fee);
    }

    /// @dev Claims up to MAX_CLAIM_BATCH open allocations, paying exactly once to the employee.
    /// Reads and removes the last element each time to safely handle set swap-and-pop removal.
    /// @param employee Employee whose allocations are settled and who receives the tokens.
    /// @param claimer Employee or authorized relayer that initiated the call.
    function _claimAll(address employee, address claimer) internal {
        EnumerableSet.Bytes32Set storage open = _openPayrolls[employee];
        uint256 count = open.length();
        if (count == 0) revert NoClaimableBalance();
        if (count > MAX_CLAIM_BATCH) count = MAX_CLAIM_BATCH;
        uint256 sum;
        for (uint256 i = 0; i < count; ++i) {
            bytes32 payrollId = open.at(open.length() - 1);
            sum += _settleClaim(
                payrollId, employee, claimer, payrolls[payrollId], allocations[payrollId][employee]
            );
        }
        if (sum == 0) revert NoClaimableBalance();
        claimableBalance[employee] -= sum;
        totalClaimed[employee] += sum;
        USDC.safeTransfer(employee, sum);
        emit SalaryClaimed(employee, sum, claimer);
    }

    /// @dev Settles an open allocation without token interaction; caller handles aggregate accounting.
    /// @param payrollId Payroll identifier to remove from the open set.
    /// @param employee Beneficiary of the allocation.
    /// @param claimer Account initiating the claim, for event attribution.
    /// @param payroll Existing FUNDED payroll with sufficient remaining escrow.
    /// @param allocation Existing, unclaimed and unrefunded allocation.
    /// @return amount Raw USDC amount settled.
    function _settleClaim(
        bytes32 payrollId, address employee, address claimer,
        PayrollMeta storage payroll, Allocation storage allocation
    ) internal returns (uint256 amount) {
        amount = allocation.amount;
        allocation.claimed = true;
        payroll.remainingEscrow -= amount;
        totalEscrowed -= amount;
        _openPayrolls[employee].remove(payrollId);
        if (payroll.remainingEscrow == 0) payroll.status = PayrollStatus.COMPLETED;
        emit PayrollSalaryClaimed(payrollId, employee, amount, claimer);
    }

    /// @dev Looks up a payroll and requires that it exists.
    /// @param payrollId Payroll identifier to look up.
    /// @return payroll Storage reference to existing metadata.
    function _requirePayroll(bytes32 payrollId) internal view returns (PayrollMeta storage payroll) {
        payroll = payrolls[payrollId];
        if (!payroll.exists) revert PayrollNotFound(payrollId);
    }

    /// @dev Looks up an allocation and rejects absent or already settled allocations.
    /// @param payrollId Payroll identifier to look up.
    /// @param employee Employee whose allocation is required.
    /// @return allocation Storage reference to an unpaid, unrefunded allocation.
    function _requireUnsettledAllocation(bytes32 payrollId, address employee)
        internal view returns (Allocation storage allocation)
    {
        allocation = allocations[payrollId][employee];
        if (allocation.amount == 0) revert AllocationNotFound(payrollId, employee);
        if (allocation.claimed) revert AlreadyClaimed(payrollId, employee);
        if (allocation.refunded) revert AlreadyRefunded(payrollId, employee);
    }

    /// @dev Validates admin before the inherited constructor can emit its different zero-address error.
    /// @param account Address that must be nonzero.
    /// @return The unchanged nonzero address.
    function _requireNonZero(address account) private pure returns (address) {
        if (account == address(0)) revert ZeroAddress();
        return account;
    }
}
