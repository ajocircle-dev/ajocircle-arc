// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AjoCircle} from "../AjoCircle.sol";

/// @dev Simple mintable 6-decimals ERC-20 standing in for USDC.
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "mUSDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @dev Token whose transfers TO a blocked address revert (simulates a blacklisted recipient).
contract FlakyUSDC is MockUSDC {
    mapping(address => bool) public blocked;

    function setBlocked(address a, bool b) external {
        blocked[a] = b;
    }

    function _update(address from, address to, uint256 value) internal override {
        require(!blocked[to], "blocked");
        super._update(from, to, value);
    }
}

abstract contract AjoCircleBase is Test {
    MockUSDC internal usdc;
    AjoCircle internal ajo;

    address internal alice = makeAddr("alice"); // creator
    address internal bob = makeAddr("bob");
    address internal carol = makeAddr("carol");
    address internal dave = makeAddr("dave");
    address internal keeper = makeAddr("keeper");

    uint256 internal constant AMT = 100e6;
    uint256 internal constant DUR = 1 days;
    uint256 internal constant START_BAL = 10_000e6;

    function setUp() public virtual {
        usdc = new MockUSDC();
        ajo = new AjoCircle(usdc);
        _fundAll();
    }

    function _fund(address a) internal {
        usdc.mint(a, START_BAL);
        vm.prank(a);
        usdc.approve(address(ajo), type(uint256).max);
    }

    function _fundAll() internal {
        _fund(alice);
        _fund(bob);
        _fund(carol);
        _fund(dave);
    }

    function _create(bool rnd, bool coll) internal returns (uint256 id) {
        vm.prank(alice);
        id = ajo.createCircle("Circle", AMT, 4, DUR, rnd, coll);
    }

    function _joinRest(uint256 id) internal {
        vm.prank(bob);
        ajo.join(id);
        vm.prank(carol);
        ajo.join(id);
        vm.prank(dave);
        ajo.join(id);
    }

    /// @dev Create + join all + start (join-order circle becomes Active immediately).
    function _activeJoinOrder(bool coll) internal returns (uint256 id) {
        id = _create(false, coll);
        _joinRest(id);
        vm.prank(alice);
        ajo.start(id);
    }

    function _pay(uint256 id, address m) internal {
        vm.prank(m);
        ajo.contribute(id);
    }

    function _status(uint256 id) internal view returns (AjoCircle.Status) {
        return ajo.getCircle(id).status;
    }

    function _deadline(uint256 id) internal view returns (uint256) {
        return ajo.getCircle(id).roundDeadline;
    }

    function _settle(uint256 id) internal {
        vm.prank(keeper);
        ajo.settleRound(id);
    }

    /// @dev Create N-member circle with members address(0x1000+i), fully funded; creator is index 0.
    function _setupN(uint256 n, uint256 amt, bool coll, bool rnd)
        internal
        returns (uint256 id, address[] memory ms)
    {
        ms = new address[](n);
        for (uint256 i; i < n; ++i) {
            ms[i] = address(uint160(0x1000 + i));
            usdc.mint(ms[i], 1e30);
            vm.prank(ms[i]);
            usdc.approve(address(ajo), type(uint256).max);
        }
        vm.prank(ms[0]);
        id = ajo.createCircle("Fuzz", amt, n, DUR, rnd, coll);
        for (uint256 i = 1; i < n; ++i) {
            vm.prank(ms[i]);
            ajo.join(id);
        }
        vm.prank(ms[0]);
        ajo.start(id);
        if (rnd) {
            vm.roll(ajo.getCircle(id).seedBlock + 1);
            ajo.finalizeDraw(id);
        }
    }
}

contract AjoCircleTest is AjoCircleBase {
    // ------------------------------------------------------------------
    // 1. Happy path
    // ------------------------------------------------------------------

    function test_HappyPath_JoinOrder_Collateral_FullRotation() public {
        uint256 id = _create(false, true);
        _joinRest(id);
        assertEq(usdc.balanceOf(address(ajo)), 4 * AMT, "collateral escrowed");
        assertEq(ajo.circleCount(), 1);

        address[] memory order = new address[](4);
        order[0] = alice;
        order[1] = bob;
        order[2] = carol;
        order[3] = dave;

        vm.expectEmit(true, false, false, true, address(ajo));
        emit AjoCircle.CircleStarted(id, order);
        vm.prank(alice);
        ajo.start(id);

        assertEq(uint8(_status(id)), uint8(AjoCircle.Status.Active));
        assertEq(ajo.getPayoutOrder(id), order);

        for (uint256 r; r < 4; ++r) {
            address rcpt = order[r];
            assertEq(ajo.currentRecipient(id), rcpt);

            vm.expectEmit(true, true, true, true, address(ajo));
            emit AjoCircle.Contributed(id, r, order[0], AMT);
            _pay(id, order[0]);
            for (uint256 k = 1; k < 4; ++k) {
                _pay(id, order[k]);
            }
            assertTrue(ajo.hasPaid(id, rcpt));

            uint256 before = usdc.balanceOf(rcpt);
            // Round 2 settles via warp past the deadline (everyone had already paid).
            if (r == 2) vm.warp(_deadline(id) + 1);

            if (r == 3) {
                vm.expectEmit(true, true, false, true, address(ajo));
                emit AjoCircle.CollateralReturned(id, alice, AMT);
            }
            vm.expectEmit(true, true, true, true, address(ajo));
            emit AjoCircle.RoundSettled(id, r, rcpt, 4 * AMT);
            if (r == 3) {
                vm.expectEmit(true, false, false, true, address(ajo));
                emit AjoCircle.CircleCompleted(id);
            }
            _settle(id);

            // final settle also refunds the recipient's own collateral
            assertEq(usdc.balanceOf(rcpt), before + 4 * AMT + (r == 3 ? AMT : 0), "recipient got full pot");
            if (r < 3) {
                assertEq(uint8(_status(id)), uint8(AjoCircle.Status.Active));
                assertEq(ajo.getCircle(id).currentRound, r + 1);
                assertEq(ajo.getCircle(id).paidCount, 0);
            }
        }

        assertEq(uint8(_status(id)), uint8(AjoCircle.Status.Completed));
        assertEq(ajo.currentRecipient(id), address(0));
        assertEq(usdc.balanceOf(address(ajo)), 0, "contract drained");
        for (uint256 i; i < 4; ++i) {
            assertEq(usdc.balanceOf(order[i]), START_BAL, "net zero, collateral returned");
            (bool isM, uint256 col, bool dflt,,) = ajo.getMemberInfo(id, order[i]);
            assertTrue(isM);
            assertEq(col, 0);
            assertFalse(dflt);
        }
    }

    function test_HappyPath_NoCollateral_Completes() public {
        uint256 id = _activeJoinOrder(false);
        assertEq(usdc.balanceOf(address(ajo)), 0);
        for (uint256 r; r < 4; ++r) {
            _pay(id, alice);
            _pay(id, bob);
            _pay(id, carol);
            _pay(id, dave);
            _settle(id);
        }
        assertEq(uint8(_status(id)), uint8(AjoCircle.Status.Completed));
        assertEq(usdc.balanceOf(address(ajo)), 0);
        assertEq(usdc.balanceOf(alice), START_BAL);
    }

    // ------------------------------------------------------------------
    // 2. Missed payment + slash
    // ------------------------------------------------------------------

    function test_MissedPayment_SlashesExactlyContribution_FullPotToRecipient() public {
        uint256 id = _activeJoinOrder(true);
        _pay(id, alice);
        _pay(id, bob);
        _pay(id, carol);

        // Not settleable before the deadline while a member is unpaid.
        vm.warp(_deadline(id) - 1);
        vm.expectRevert(AjoCircle.RoundNotSettleable.selector);
        _settle(id);

        vm.warp(_deadline(id) + 1);
        // Late contribution is rejected.
        vm.expectRevert(AjoCircle.RoundExpired.selector);
        _pay(id, dave);

        uint256 before = usdc.balanceOf(alice);

        vm.expectEmit(true, true, true, true, address(ajo));
        emit AjoCircle.CollateralSlashed(id, 0, dave, AMT);
        vm.expectEmit(true, true, false, true, address(ajo));
        emit AjoCircle.DefaulterFlagged(id, dave);
        vm.expectEmit(true, true, true, true, address(ajo));
        emit AjoCircle.RoundSettled(id, 0, alice, 4 * AMT);
        _settle(id);

        // 3 paid contributions + 1 slashed collateral = full pot.
        assertEq(usdc.balanceOf(alice), before + 4 * AMT);
        (, uint256 col, bool dflt, uint256 defaults,) = ajo.getMemberInfo(id, dave);
        assertEq(col, 0, "exactly one contribution slashed from collateral of one contribution");
        assertTrue(dflt);
        assertEq(defaults, 1);
        (, uint256 bobCol, bool bobDflt,,) = ajo.getMemberInfo(id, bob);
        assertEq(bobCol, AMT);
        assertFalse(bobDflt);
    }

    function test_MissedPayment_RepeatedDefault_CollateralAlreadyZero_ShortPot() public {
        uint256 id = _activeJoinOrder(true);
        // Round 0: dave misses.
        _pay(id, alice);
        _pay(id, bob);
        _pay(id, carol);
        vm.warp(_deadline(id));
        _settle(id);
        // Round 1: dave misses again; collateral already 0 -> pot is short by one contribution.
        _pay(id, alice);
        _pay(id, bob);
        _pay(id, carol);
        uint256 bobBefore = usdc.balanceOf(bob);
        vm.warp(_deadline(id));
        vm.expectEmit(true, true, true, true, address(ajo));
        emit AjoCircle.CollateralSlashed(id, 1, dave, 0);
        vm.expectEmit(true, true, true, true, address(ajo));
        emit AjoCircle.RoundSettled(id, 1, bob, 3 * AMT);
        _settle(id);
        assertEq(usdc.balanceOf(bob), bobBefore + 3 * AMT, "short pot");
        (,, bool dflt, uint256 defaults,) = ajo.getMemberInfo(id, dave);
        assertTrue(dflt);
        assertEq(defaults, 2);
    }

    function test_MissedPayment_Persistent_FullCircleConservation() public {
        uint256 id = _activeJoinOrder(true);
        for (uint256 r; r < 4; ++r) {
            _pay(id, alice);
            _pay(id, bob);
            _pay(id, carol);
            vm.warp(_deadline(id));
            _settle(id);
        }
        assertEq(uint8(_status(id)), uint8(AjoCircle.Status.Completed));
        assertEq(usdc.balanceOf(address(ajo)), 0);
        assertEq(usdc.balanceOf(alice), START_BAL);
        assertEq(usdc.balanceOf(bob), START_BAL - AMT);
        assertEq(usdc.balanceOf(carol), START_BAL - AMT);
        assertEq(usdc.balanceOf(dave), START_BAL + 2 * AMT);
    }

    function test_MissedPayment_NoCollateral_ShortPot() public {
        uint256 id = _activeJoinOrder(false);
        _pay(id, alice);
        _pay(id, bob);
        _pay(id, carol);
        vm.warp(_deadline(id) + 5);
        uint256 before = usdc.balanceOf(alice);

        vm.expectEmit(true, true, true, true, address(ajo));
        emit AjoCircle.CollateralSlashed(id, 0, dave, 0);
        vm.expectEmit(true, true, true, true, address(ajo));
        emit AjoCircle.RoundSettled(id, 0, alice, 3 * AMT);
        _settle(id);

        assertEq(usdc.balanceOf(alice), before + 3 * AMT);
        (,, bool dflt, uint256 defaults,) = ajo.getMemberInfo(id, dave);
        assertTrue(dflt);
        assertEq(defaults, 1);
        // Contract holds exactly the unpaid-out contributions of the remaining (future) rounds: none yet.
        assertEq(usdc.balanceOf(address(ajo)), 0);
    }

    function test_SettleAtExactDeadline_WithUnpaid_Succeeds() public {
        uint256 id = _activeJoinOrder(true);
        _pay(id, alice);
        vm.warp(_deadline(id));
        _settle(id);
        assertEq(ajo.getCircle(id).currentRound, 1);
    }

    // ------------------------------------------------------------------
    // 3. Leaving before start / cancel
    // ------------------------------------------------------------------

    function test_Leave_RefundsCollateral_PreservesJoinOrder() public {
        uint256 id = _create(false, true);
        _joinRest(id); // [alice, bob, carol, dave]
        uint256 bobBefore = usdc.balanceOf(bob);

        vm.expectEmit(true, true, false, true, address(ajo));
        emit AjoCircle.MemberLeft(id, bob, AMT);
        vm.prank(bob);
        ajo.leave(id);

        assertEq(usdc.balanceOf(bob), bobBefore + AMT);
        assertEq(usdc.balanceOf(address(ajo)), 3 * AMT);
        address[] memory ms = ajo.getMembers(id);
        assertEq(ms.length, 3);
        assertEq(ms[0], alice);
        assertEq(ms[1], carol);
        assertEq(ms[2], dave);
        (bool isM, uint256 col,,,) = ajo.getMemberInfo(id, bob);
        assertFalse(isM);
        assertEq(col, 0);
        assertEq(ajo.getCircle(id).memberCount, 3);

        // Bob rejoins at the end; relative order of others retained; payout order follows join order.
        vm.prank(bob);
        ajo.join(id);
        vm.prank(alice);
        ajo.start(id);
        address[] memory order = ajo.getPayoutOrder(id);
        assertEq(order[0], alice);
        assertEq(order[1], carol);
        assertEq(order[2], dave);
        assertEq(order[3], bob);
    }

    function test_Leave_FirstMiddleMembers_OrderPreserved() public {
        uint256 id = _create(false, false);
        _joinRest(id);
        vm.prank(carol);
        ajo.leave(id);
        vm.prank(bob);
        ajo.leave(id);
        address[] memory ms = ajo.getMembers(id);
        assertEq(ms.length, 2);
        assertEq(ms[0], alice);
        assertEq(ms[1], dave);
    }

    function test_Leave_CreatorCannotLeave() public {
        uint256 id = _create(false, true);
        vm.prank(alice);
        vm.expectRevert(AjoCircle.CreatorCannotLeave.selector);
        ajo.leave(id);
    }

    function test_Leave_NonMemberReverts() public {
        uint256 id = _create(false, true);
        vm.prank(bob);
        vm.expectRevert(AjoCircle.NotMember.selector);
        ajo.leave(id);
    }

    function test_Leave_AfterStartReverts() public {
        uint256 id = _activeJoinOrder(true);
        vm.prank(bob);
        vm.expectRevert(AjoCircle.InvalidStatus.selector);
        ajo.leave(id);
    }

    function test_Leave_AfterCancelReverts() public {
        uint256 id = _create(false, true);
        _joinRest(id);
        vm.prank(alice);
        ajo.cancelCircle(id);
        vm.prank(bob);
        vm.expectRevert(AjoCircle.InvalidStatus.selector);
        ajo.leave(id);
    }

    function test_CancelCircle_RefundsEveryone() public {
        uint256 id = _create(false, true);
        _joinRest(id);
        assertEq(usdc.balanceOf(address(ajo)), 4 * AMT);

        vm.expectEmit(true, false, false, true, address(ajo));
        emit AjoCircle.CircleCancelled(id);
        vm.prank(alice);
        ajo.cancelCircle(id);

        assertEq(uint8(_status(id)), uint8(AjoCircle.Status.Cancelled));
        assertEq(usdc.balanceOf(address(ajo)), 0);
        assertEq(usdc.balanceOf(alice), START_BAL);
        assertEq(usdc.balanceOf(bob), START_BAL);
        assertEq(usdc.balanceOf(carol), START_BAL);
        assertEq(usdc.balanceOf(dave), START_BAL);
        (, uint256 col,,,) = ajo.getMemberInfo(id, bob);
        assertEq(col, 0);
    }

    function test_CancelCircle_OnlyCreator() public {
        uint256 id = _create(false, true);
        vm.prank(bob);
        vm.expectRevert(AjoCircle.CreatorOnly.selector);
        ajo.cancelCircle(id);
    }

    function test_CancelCircle_AfterStartReverts() public {
        uint256 id = _activeJoinOrder(true);
        vm.prank(alice);
        vm.expectRevert(AjoCircle.InvalidStatus.selector);
        ajo.cancelCircle(id);
    }
}
