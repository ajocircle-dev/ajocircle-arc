// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title AjoCircle
/// @notice Permissionless rotating savings circles denominated in the constructor's USDC token.
/// @dev Assumes a trusted, non-rebasing, fee-free ERC-20 such as USDC. Amounts use token base units.
///      One contribution of collateral cannot insure repeated defaults: later pots may be short.
///      No administrator, upgrades, late-payment recovery, or guarantee of future contributions exists.
contract AjoCircle is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant MIN_MEMBERS = 2;
    uint256 public constant MAX_MEMBERS = 30;
    uint256 public constant MIN_ROUND_DURATION = 60 seconds;
    uint256 public constant MAX_ROUND_DURATION = 365 days;
    uint256 public constant MAX_NAME_LENGTH = 64;

    uint256 public constant SEED_DELAY = 3;
    uint256 public constant SEED_EXPIRY = 200;

    enum Status { Open, Drawing, Active, Completed, Cancelled }

    /// @dev currentRound is zero-indexed; roundDeadline is zero outside Active status.
    struct Circle {
        uint256 id;
        address creator;
        string name;
        uint256 contributionAmount;
        uint256 maxMembers;
        uint256 roundDuration;
        bool randomOrder;
        bool collateralRequired;
        Status status;
        uint256 memberCount;
        uint256 currentRound;
        uint256 roundStart;
        uint256 roundDeadline;
        uint256 paidCount;
        uint256 startedAt;
        uint256 seedBlock;
    }

    struct MemberInfo {
        bool isMember;
        uint256 collateral;
        bool defaulter;
        uint256 defaults;
    }

    IERC20 public immutable usdc;
    uint256 public circleCount;
    mapping(uint256 => Circle) private _circles;
    mapping(uint256 => address[]) private _members;
    mapping(uint256 => address[]) private _payoutOrder;
    mapping(uint256 => mapping(address => MemberInfo)) private _memberInfo;
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) private _paid;
    mapping(uint256 => mapping(address => uint256)) public pendingWithdrawal;

    error ZeroAddress();
    error CircleNotFound();
    error InvalidName();
    error InvalidContributionAmount();
    error InvalidMaxMembers();
    error InvalidRoundDuration();
    error InvalidStatus();
    error CreatorOnly();
    error CreatorCannotLeave();
    error AlreadyMember();
    error NotMember();
    error CircleFull();
    error CircleNotFull();
    error DrawNotReady();
    error AlreadyPaid();
    error RoundExpired();
    error RoundNotSettleable();
    error NothingToWithdraw();

    event CircleCreated(
        uint256 indexed circleId, address indexed creator, string name, uint256 contributionAmount,
        uint256 maxMembers, uint256 roundDuration, bool randomOrder, bool collateralRequired
    );
    event MemberJoined(uint256 indexed circleId, address indexed member, uint256 collateral);
    event MemberLeft(uint256 indexed circleId, address indexed member, uint256 refunded);
    event CircleCancelled(uint256 indexed circleId);
    event CircleDrawStarted(uint256 indexed circleId, uint256 seedBlock);
    event CircleStarted(uint256 indexed circleId, address[] payoutOrder);
    event Contributed(uint256 indexed circleId, uint256 indexed round, address indexed member, uint256 amount);
    event CollateralSlashed(uint256 indexed circleId, uint256 indexed round, address indexed member, uint256 slashed);
    event DefaulterFlagged(uint256 indexed circleId, address indexed member);
    event RoundSettled(uint256 indexed circleId, uint256 indexed round, address indexed recipient, uint256 payoutAmount);
    event CollateralReturned(uint256 indexed circleId, address indexed member, uint256 amount);
    event CircleCompleted(uint256 indexed circleId);
    event PayoutDeferred(uint256 indexed circleId, address indexed to, uint256 amount);
    event Withdrawn(uint256 indexed circleId, address indexed member, uint256 amount);

    /// @param usdc_ Trusted USDC-compatible token; callers approve this contract before joining or paying.
    constructor(IERC20 usdc_) {
        if (address(usdc_) == address(0)) revert ZeroAddress();
        usdc = usdc_;
    }

    /// @notice Create an open circle and automatically join as its first member.
    function createCircle(
        string calldata name, uint256 contributionAmount, uint256 maxMembers,
        uint256 roundDuration, bool randomOrder, bool collateralRequired
    ) external nonReentrant returns (uint256 circleId) {
        if (bytes(name).length == 0 || bytes(name).length > MAX_NAME_LENGTH) revert InvalidName();
        if (contributionAmount == 0) revert InvalidContributionAmount();
        if (maxMembers < MIN_MEMBERS || maxMembers > MAX_MEMBERS) revert InvalidMaxMembers();
        if (roundDuration < MIN_ROUND_DURATION || roundDuration > MAX_ROUND_DURATION) {
            revert InvalidRoundDuration();
        }
        // Ensure a fully funded round's pot is representable without arithmetic overflow.
        if (contributionAmount > type(uint256).max / maxMembers) revert InvalidContributionAmount();
        circleId = ++circleCount;
        Circle storage c = _circles[circleId];
        c.id = circleId;
        c.creator = msg.sender;
        c.name = name;
        c.contributionAmount = contributionAmount;
        c.maxMembers = maxMembers;
        c.roundDuration = roundDuration;
        c.randomOrder = randomOrder;
        c.collateralRequired = collateralRequired;
        emit CircleCreated(
            circleId, msg.sender, name, contributionAmount, maxMembers,
            roundDuration, randomOrder, collateralRequired
        );
        _join(c);
    }

    /// @notice Join an open circle, escrowing one contribution if collateral is required.
    function join(uint256 circleId) external nonReentrant {
        Circle storage c = _getCircle(circleId);
        _requireStatus(c, Status.Open);
        if (_memberInfo[circleId][msg.sender].isMember) revert AlreadyMember();
        if (c.memberCount == c.maxMembers) revert CircleFull();
        _join(c);
    }

    /// @notice Leave an open circle without changing the relative join order of remaining members.
    function leave(uint256 circleId) external nonReentrant {
        Circle storage c = _getCircle(circleId);
        _requireStatus(c, Status.Open);
        if (msg.sender == c.creator) revert CreatorCannotLeave();
        MemberInfo storage info = _memberInfo[circleId][msg.sender];
        if (!info.isMember) revert NotMember();
        uint256 refund = info.collateral;
        info.isMember = false;
        info.collateral = 0;
        address[] storage members = _members[circleId];
        uint256 length = members.length;
        for (uint256 i; i < length; ++i) {
            if (members[i] == msg.sender) {
                for (uint256 j = i; j + 1 < length; ++j) members[j] = members[j + 1];
                members.pop();
                break;
            }
        }
        --c.memberCount;
        emit MemberLeft(circleId, msg.sender, refund);
        _payOut(circleId, msg.sender, refund);
    }

    /// @notice The creator may cancel before starting, releasing all escrowed collateral.
    function cancelCircle(uint256 circleId) external nonReentrant {
        Circle storage c = _getCircle(circleId);
        _requireCreator(c);
        _requireStatus(c, Status.Open);
        c.status = Status.Cancelled;
        uint256[] memory refunds = _releaseCollateral(circleId);
        emit CircleCancelled(circleId);
        _refundCollateral(circleId, refunds);
    }

    /// @notice Start a full join-order circle, or lock membership and commit a random draw to a future block.
    /// @dev The creator cannot see or reroll the order before the seed block exists, nor cancel while Drawing.
    ///      Anyone can finalize the draw after the seed block; see finalizeDraw for residual risks.
    function start(uint256 circleId) external nonReentrant {
        Circle storage c = _getCircle(circleId);
        _requireCreator(c);
        _requireStatus(c, Status.Open);
        if (c.memberCount != c.maxMembers) revert CircleNotFull();
        if (c.randomOrder) {
            c.status = Status.Drawing;
            c.seedBlock = block.number + SEED_DELAY;
            emit CircleDrawStarted(circleId, c.seedBlock);
            return;
        }
        address[] memory order = _members[circleId];
        _payoutOrder[circleId] = order;
        c.status = Status.Active;
        c.currentRound = 0;
        c.startedAt = block.timestamp;
        c.roundStart = block.timestamp;
        c.roundDeadline = block.timestamp + c.roundDuration;
        emit CircleStarted(circleId, order);
    }

    /// @notice Anyone may finalize a pending draw, or re-commit it if its seed block has expired.
    /// @dev The creator may withhold finalization until expiry to seek a reroll if nobody else finalizes.
    ///      Any member or the UI can mitigate this by finalizing immediately after the seed block.
    ///      Validators are a trusted-chain assumption on Arc; this is not cryptographically secure randomness.
    function finalizeDraw(uint256 circleId) external nonReentrant {
        Circle storage c = _getCircle(circleId);
        _requireStatus(c, Status.Drawing);
        if (block.number <= c.seedBlock) revert DrawNotReady();
        if (block.number > c.seedBlock + SEED_EXPIRY) {
            c.seedBlock = block.number + SEED_DELAY;
            emit CircleDrawStarted(circleId, c.seedBlock);
            return;
        }
        address[] memory order = _members[circleId];
        bytes32 seed = keccak256(abi.encode(blockhash(c.seedBlock), circleId, order));
        for (uint256 i = order.length - 1; i > 0; --i) {
            seed = keccak256(abi.encode(seed, i));
            uint256 j = uint256(seed) % (i + 1);
            (order[i], order[j]) = (order[j], order[i]);
        }
        _payoutOrder[circleId] = order;
        c.status = Status.Active;
        c.currentRound = 0;
        c.startedAt = block.timestamp;
        c.roundStart = block.timestamp;
        c.roundDeadline = block.timestamp + c.roundDuration;
        emit CircleStarted(circleId, order);
    }

    /// @notice Pay the current round once. At the exact deadline, payment and settlement may race.
    function contribute(uint256 circleId) external nonReentrant {
        Circle storage c = _getCircle(circleId);
        _requireStatus(c, Status.Active);
        if (!_memberInfo[circleId][msg.sender].isMember) revert NotMember();
        if (_paid[circleId][c.currentRound][msg.sender]) revert AlreadyPaid();
        if (block.timestamp > c.roundDeadline) revert RoundExpired();
        _paid[circleId][c.currentRound][msg.sender] = true;
        ++c.paidCount;
        emit Contributed(circleId, c.currentRound, msg.sender, c.contributionAmount);
        usdc.safeTransferFrom(msg.sender, address(this), c.contributionAmount);
    }

    /// @notice Settle a fully paid or expired round; anyone may advance the circle.
    /// @dev Slashes only available collateral, so insufficient collateral produces a short pot.
    ///      All round and collateral effects finish before outgoing transfers; failed pushes are credited.
    function settleRound(uint256 circleId) external nonReentrant {
        Circle storage c = _getCircle(circleId);
        _requireStatus(c, Status.Active);
        if (c.paidCount != c.memberCount && block.timestamp < c.roundDeadline) revert RoundNotSettleable();
        uint256 round = c.currentRound;
        address recipient = _payoutOrder[circleId][round];
        uint256 pot = c.paidCount * c.contributionAmount + _slashDefaulters(c);
        bool finalRound = round == c.memberCount - 1;
        uint256[] memory refunds;
        if (finalRound) {
            c.status = Status.Completed;
            c.roundDeadline = 0;
            refunds = _releaseCollateral(circleId);
        } else {
            c.currentRound = round + 1;
            c.roundStart = block.timestamp;
            c.roundDeadline = block.timestamp + c.roundDuration;
            c.paidCount = 0;
        }
        emit RoundSettled(circleId, round, recipient, pot);
        if (finalRound) emit CircleCompleted(circleId);
        _payOut(circleId, recipient, pot);
        if (finalRound) _refundCollateral(circleId, refunds);
    }

    /// @notice Retry your deferred payouts, including after leaving or after cancellation/completion.
    /// @dev A failed safeTransfer reverts, atomically restoring the pending balance for another retry.
    function withdraw(uint256 circleId) external nonReentrant {
        _getCircle(circleId);
        uint256 amount = pendingWithdrawal[circleId][msg.sender];
        if (amount == 0) revert NothingToWithdraw();
        pendingWithdrawal[circleId][msg.sender] = 0;
        emit Withdrawn(circleId, msg.sender, amount);
        usdc.safeTransfer(msg.sender, amount);
    }

    /// @notice Return all circle metadata. Unknown IDs revert throughout the circle-specific views.
    function getCircle(uint256 circleId) external view returns (Circle memory) {
        return _getCircle(circleId);
    }

    /// @notice Return members in join order (retained after cancellation or completion).
    function getMembers(uint256 circleId) external view returns (address[] memory) {
        _getCircle(circleId);
        return _members[circleId];
    }

    /// @notice Return the fixed payout order once activated; empty before Active, including while Drawing.
    function getPayoutOrder(uint256 circleId) external view returns (address[] memory) {
        _getCircle(circleId);
        return _payoutOrder[circleId];
    }

    /// @notice Return whether a member paid currentRound, including the final round after completion.
    function hasPaid(uint256 circleId, address member) external view returns (bool) {
        Circle storage c = _getCircle(circleId);
        return _paid[circleId][c.currentRound][member];
    }

    /// @notice Return historical payment tracking; nonexistent round indices return false.
    function hasPaidRound(uint256 circleId, uint256 round, address member) external view returns (bool) {
        _getCircle(circleId);
        return _paid[circleId][round][member];
    }

    /// @notice Return the recipient only while a circle is Active, otherwise address(0).
    function currentRecipient(uint256 circleId) external view returns (address) {
        Circle storage c = _getCircle(circleId);
        return c.status == Status.Active ? _payoutOrder[circleId][c.currentRound] : address(0);
    }

    /// @notice Return membership, remaining collateral, default history and deferred balance.
    function getMemberInfo(uint256 circleId, address member) external view returns (
        bool isMember, uint256 collateral, bool defaulter, uint256 defaults, uint256 pending
    ) {
        _getCircle(circleId);
        MemberInfo storage info = _memberInfo[circleId][member];
        return (info.isMember, info.collateral, info.defaulter, info.defaults, pendingWithdrawal[circleId][member]);
    }

    function _getCircle(uint256 circleId) internal view returns (Circle storage c) {
        c = _circles[circleId];
        if (c.id == 0) revert CircleNotFound();
    }

    function _requireStatus(Circle storage c, Status expected) internal view {
        if (c.status != expected) revert InvalidStatus();
    }

    function _requireCreator(Circle storage c) internal view {
        if (msg.sender != c.creator) revert CreatorOnly();
    }

    function _join(Circle storage c) internal {
        uint256 collateral = c.collateralRequired ? c.contributionAmount : 0;
        _memberInfo[c.id][msg.sender] = MemberInfo(true, collateral, false, 0);
        _members[c.id].push(msg.sender);
        ++c.memberCount;
        emit MemberJoined(c.id, msg.sender, collateral);
        if (collateral != 0) usdc.safeTransferFrom(msg.sender, address(this), collateral);
    }

    function _slashDefaulters(Circle storage c) internal returns (uint256 totalSlashed) {
        address[] storage members = _members[c.id];
        for (uint256 i; i < members.length; ++i) {
            address member = members[i];
            if (_paid[c.id][c.currentRound][member]) continue;
            MemberInfo storage info = _memberInfo[c.id][member];
            uint256 slashed = info.collateral < c.contributionAmount ? info.collateral : c.contributionAmount;
            info.collateral -= slashed;
            totalSlashed += slashed;
            ++info.defaults;
            emit CollateralSlashed(c.id, c.currentRound, member, slashed);
            if (!info.defaulter) {
                info.defaulter = true;
                emit DefaulterFlagged(c.id, member);
            }
        }
    }

    /// @dev Clear every collateral balance before the first outgoing transfer.
    function _releaseCollateral(uint256 circleId) internal returns (uint256[] memory refunds) {
        address[] storage members = _members[circleId];
        refunds = new uint256[](members.length);
        for (uint256 i; i < members.length; ++i) {
            MemberInfo storage info = _memberInfo[circleId][members[i]];
            refunds[i] = info.collateral;
            info.collateral = 0;
            if (refunds[i] != 0) emit CollateralReturned(circleId, members[i], refunds[i]);
        }
    }

    function _refundCollateral(uint256 circleId, uint256[] memory refunds) internal {
        address[] storage members = _members[circleId];
        for (uint256 i; i < members.length; ++i) _payOut(circleId, members[i], refunds[i]);
    }

    /// @dev Shared best-effort push path; credits are the only effects contingent on transfer failure.
    function _payOut(uint256 circleId, address to, uint256 amount) internal {
        if (amount == 0) return;
        if (!usdc.trySafeTransfer(to, amount)) {
            pendingWithdrawal[circleId][to] += amount;
            emit PayoutDeferred(circleId, to, amount);
        }
    }
}
