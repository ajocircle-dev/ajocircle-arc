// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AjoCircle} from "../AjoCircle.sol";
import {AjoCircleBase, FlakyUSDC} from "./AjoCircle.t.sol";

contract AjoCircleExtraTest is AjoCircleBase {
    // ---------------- createCircle validation ----------------

    function test_Constructor_ZeroAddressReverts() public {
        vm.expectRevert(AjoCircle.ZeroAddress.selector);
        new AjoCircle(IERC20(address(0)));
    }

    function test_Create_EmitsEventAndAutoJoinsCreator() public {
        vm.expectEmit(true, true, false, true, address(ajo));
        emit AjoCircle.CircleCreated(1, alice, "Circle", AMT, 4, DUR, false, true);
        vm.expectEmit(true, true, false, true, address(ajo));
        emit AjoCircle.MemberJoined(1, alice, AMT);
        uint256 id = _create(false, true);
        assertEq(id, 1);
        assertEq(ajo.circleCount(), 1);
        assertEq(usdc.balanceOf(address(ajo)), AMT);
        AjoCircle.Circle memory c = ajo.getCircle(id);
        assertEq(c.creator, alice);
        assertEq(c.memberCount, 1);
        assertEq(uint8(c.status), uint8(AjoCircle.Status.Open));
        assertEq(ajo.currentRecipient(id), address(0));
        assertEq(ajo.getPayoutOrder(id).length, 0);
    }

    function test_Create_Reverts() public {
        vm.startPrank(alice);
        vm.expectRevert(AjoCircle.InvalidName.selector);
        ajo.createCircle("", AMT, 4, DUR, false, true);
        vm.expectRevert(AjoCircle.InvalidName.selector);
        ajo.createCircle("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", AMT, 4, DUR, false, true); // 65
        vm.expectRevert(AjoCircle.InvalidContributionAmount.selector);
        ajo.createCircle("x", 0, 4, DUR, false, true);
        vm.expectRevert(AjoCircle.InvalidMaxMembers.selector);
        ajo.createCircle("x", AMT, 1, DUR, false, true);
        vm.expectRevert(AjoCircle.InvalidMaxMembers.selector);
        ajo.createCircle("x", AMT, 31, DUR, false, true);
        vm.expectRevert(AjoCircle.InvalidRoundDuration.selector);
        ajo.createCircle("x", AMT, 4, 59, false, true);
        vm.expectRevert(AjoCircle.InvalidRoundDuration.selector);
        ajo.createCircle("x", AMT, 4, 365 days + 1, false, true);
        vm.expectRevert(AjoCircle.InvalidContributionAmount.selector);
        ajo.createCircle("x", type(uint256).max / 4 + 1, 4, DUR, false, false);
        vm.stopPrank();
    }

    function test_Create_BoundaryValuesAccepted() public {
        vm.startPrank(alice);
        ajo.createCircle("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", AMT, 2, 60, false, false); // 64
        ajo.createCircle("x", 1, 30, 365 days, false, false);
        vm.stopPrank();
        assertEq(ajo.circleCount(), 2);
    }

    // ---------------- join / start ----------------

    function test_Join_TwiceFullAndStatusReverts() public {
        uint256 id = _create(false, true);
        vm.prank(alice);
        vm.expectRevert(AjoCircle.AlreadyMember.selector);
        ajo.join(id);
        vm.prank(bob);
        ajo.join(id);
        vm.prank(bob);
        vm.expectRevert(AjoCircle.AlreadyMember.selector);
        ajo.join(id);
        vm.prank(carol);
        ajo.join(id);
        vm.prank(dave);
        ajo.join(id);
        address eve = makeAddr("eve");
        _fund(eve);
        vm.prank(eve);
        vm.expectRevert(AjoCircle.CircleFull.selector);
        ajo.join(id);
        vm.prank(alice);
        ajo.start(id);
        vm.prank(eve);
        vm.expectRevert(AjoCircle.InvalidStatus.selector);
        ajo.join(id);
    }

    function test_Join_UnknownCircleReverts() public {
        vm.prank(bob);
        vm.expectRevert(AjoCircle.CircleNotFound.selector);
        ajo.join(99);
        vm.expectRevert(AjoCircle.CircleNotFound.selector);
        ajo.getCircle(1);
    }

    function test_Join_EmitsAndEscrowsCollateral() public {
        uint256 id = _create(false, true);
        vm.expectEmit(true, true, false, true, address(ajo));
        emit AjoCircle.MemberJoined(id, bob, AMT);
        vm.prank(bob);
        ajo.join(id);
        assertEq(usdc.balanceOf(bob), START_BAL - AMT);
        (bool isM, uint256 col,,,) = ajo.getMemberInfo(id, bob);
        assertTrue(isM);
        assertEq(col, AMT);
    }

    function test_Start_OnlyCreatorAndOnlyWhenFull() public {
        uint256 id = _create(false, true);
        vm.prank(alice);
        vm.expectRevert(AjoCircle.CircleNotFull.selector);
        ajo.start(id);
        _joinRest(id);
        vm.prank(bob);
        vm.expectRevert(AjoCircle.CreatorOnly.selector);
        ajo.start(id);
        vm.prank(alice);
        ajo.start(id);
        vm.prank(alice);
        vm.expectRevert(AjoCircle.InvalidStatus.selector);
        ajo.start(id);
    }

    // ---------------- contribute / settle reverts ----------------

    function test_Contribute_DoubleReverts() public {
        uint256 id = _activeJoinOrder(true);
        _pay(id, bob);
        assertTrue(ajo.hasPaid(id, bob));
        assertTrue(ajo.hasPaidRound(id, 0, bob));
        assertFalse(ajo.hasPaid(id, carol));
        vm.prank(bob);
        vm.expectRevert(AjoCircle.AlreadyPaid.selector);
        ajo.contribute(id);
    }

    function test_Contribute_NonMemberAndNotActiveRevert() public {
        uint256 id = _create(false, true);
        vm.prank(alice);
        vm.expectRevert(AjoCircle.InvalidStatus.selector);
        ajo.contribute(id);
        _joinRest(id);
        vm.prank(alice);
        ajo.start(id);
        address eve = makeAddr("eve");
        _fund(eve);
        vm.prank(eve);
        vm.expectRevert(AjoCircle.NotMember.selector);
        ajo.contribute(id);
    }

    function test_Contribute_AtExactDeadlineAllowed_AfterReverts() public {
        uint256 id = _activeJoinOrder(false);
        vm.warp(_deadline(id));
        _pay(id, alice);
        vm.warp(_deadline(id) + 1);
        vm.expectRevert(AjoCircle.RoundExpired.selector);
        _pay(id, bob);
    }

    function test_Settle_BeforeDeadlineNotAllPaidReverts() public {
        uint256 id = _activeJoinOrder(true);
        _pay(id, alice);
        vm.expectRevert(AjoCircle.RoundNotSettleable.selector);
        _settle(id);
    }

    function test_Settle_AllPaidBeforeDeadlineSucceeds() public {
        uint256 id = _activeJoinOrder(true);
        _pay(id, alice);
        _pay(id, bob);
        _pay(id, carol);
        _pay(id, dave);
        _settle(id);
        assertEq(ajo.currentRecipient(id), bob);
    }

    function test_Settle_NotActiveReverts() public {
        uint256 id = _create(false, true);
        vm.expectRevert(AjoCircle.InvalidStatus.selector);
        _settle(id);
    }

    function test_Settle_AfterCompletionReverts() public {
        uint256 id = _activeJoinOrder(false);
        for (uint256 r; r < 4; ++r) {
            vm.warp(_deadline(id));
            _settle(id);
        }
        assertEq(uint8(_status(id)), uint8(AjoCircle.Status.Completed));
        vm.expectRevert(AjoCircle.InvalidStatus.selector);
        _settle(id);
    }

    // ---------------- random order ----------------

    function test_Random_StartMovesToDrawing() public {
        uint256 id = _create(true, true);
        _joinRest(id);
        uint256 expectedSeed = block.number + ajo.SEED_DELAY();
        vm.expectEmit(true, false, false, true, address(ajo));
        emit AjoCircle.CircleDrawStarted(id, expectedSeed);
        vm.prank(alice);
        ajo.start(id);
        assertEq(uint8(_status(id)), uint8(AjoCircle.Status.Drawing));
        assertEq(ajo.getCircle(id).seedBlock, expectedSeed);
        assertEq(ajo.getPayoutOrder(id).length, 0);
        assertEq(ajo.currentRecipient(id), address(0));
        // cancel / leave / contribute not possible while drawing
        vm.prank(alice);
        vm.expectRevert(AjoCircle.InvalidStatus.selector);
        ajo.cancelCircle(id);
        vm.prank(bob);
        vm.expectRevert(AjoCircle.InvalidStatus.selector);
        ajo.leave(id);
        vm.expectRevert(AjoCircle.InvalidStatus.selector);
        _pay(id, bob);
    }

    function test_Random_FinalizeBeforeSeedBlockReverts_AfterSucceeds() public {
        uint256 id = _create(true, true);
        _joinRest(id);
        vm.prank(alice);
        ajo.start(id);
        uint256 seed = ajo.getCircle(id).seedBlock;

        vm.expectRevert(AjoCircle.DrawNotReady.selector);
        ajo.finalizeDraw(id);
        vm.roll(seed); // still block.number <= seedBlock
        vm.expectRevert(AjoCircle.DrawNotReady.selector);
        ajo.finalizeDraw(id);

        vm.roll(seed + 1);
        vm.prank(makeAddr("anyone"));
        ajo.finalizeDraw(id);

        assertEq(uint8(_status(id)), uint8(AjoCircle.Status.Active));
        address[] memory order = ajo.getPayoutOrder(id);
        assertEq(order.length, 4);
        assertTrue(_isPermutation(order));
        assertEq(ajo.currentRecipient(id), order[0]);
        assertEq(ajo.getCircle(id).roundDeadline, block.timestamp + DUR);

        vm.expectRevert(AjoCircle.InvalidStatus.selector);
        ajo.finalizeDraw(id);
    }

    function test_Random_FullRotationConservesFunds() public {
        uint256 id = _create(true, true);
        _joinRest(id);
        vm.prank(alice);
        ajo.start(id);
        vm.roll(block.number + 10);
        ajo.finalizeDraw(id);
        address[] memory order = ajo.getPayoutOrder(id);
        for (uint256 r; r < 4; ++r) {
            assertEq(ajo.currentRecipient(id), order[r]);
            _pay(id, alice);
            _pay(id, bob);
            _pay(id, carol);
            _pay(id, dave);
            _settle(id);
        }
        assertEq(uint8(_status(id)), uint8(AjoCircle.Status.Completed));
        assertEq(usdc.balanceOf(address(ajo)), 0);
        assertEq(usdc.balanceOf(alice), START_BAL);
        assertEq(usdc.balanceOf(dave), START_BAL);
    }

    function test_Random_ExpiredSeedRecommits() public {
        uint256 id = _create(true, true);
        _joinRest(id);
        vm.prank(alice);
        ajo.start(id);
        uint256 seed = ajo.getCircle(id).seedBlock;

        // Exactly at expiry boundary (seed + 200) it is still finalizable; one later it re-commits.
        vm.roll(seed + ajo.SEED_EXPIRY() + 1);
        uint256 newSeed = block.number + ajo.SEED_DELAY();
        vm.expectEmit(true, false, false, true, address(ajo));
        emit AjoCircle.CircleDrawStarted(id, newSeed);
        ajo.finalizeDraw(id);

        assertEq(uint8(_status(id)), uint8(AjoCircle.Status.Drawing));
        assertEq(ajo.getCircle(id).seedBlock, newSeed);
        assertEq(ajo.getPayoutOrder(id).length, 0);

        vm.expectRevert(AjoCircle.DrawNotReady.selector);
        ajo.finalizeDraw(id);
        vm.roll(newSeed + 1);
        ajo.finalizeDraw(id);
        assertEq(uint8(_status(id)), uint8(AjoCircle.Status.Active));
        assertTrue(_isPermutation(ajo.getPayoutOrder(id)));
    }

    function test_Random_FinalizeAtLastValidBlock_StillFinalizes() public {
        uint256 id = _create(true, false);
        _joinRest(id);
        vm.prank(alice);
        ajo.start(id);
        vm.roll(ajo.getCircle(id).seedBlock + ajo.SEED_EXPIRY());
        ajo.finalizeDraw(id);
        assertEq(uint8(_status(id)), uint8(AjoCircle.Status.Active));
    }

    function _isPermutation(address[] memory o) internal view returns (bool) {
        address[4] memory ms = [alice, bob, carol, dave];
        if (o.length != 4) return false;
        for (uint256 i; i < 4; ++i) {
            uint256 hits;
            for (uint256 j; j < 4; ++j) {
                if (o[j] == ms[i]) ++hits;
            }
            if (hits != 1) return false;
        }
        return true;
    }

    // ---------------- PayoutDeferred / withdraw ----------------

    function _useFlaky() internal returns (FlakyUSDC t) {
        t = new FlakyUSDC();
        usdc = t;
        ajo = new AjoCircle(t);
        _fundAll();
    }

    function test_PayoutDeferred_ThenWithdraw() public {
        FlakyUSDC t = _useFlaky();
        uint256 id = _activeJoinOrder(true);
        _pay(id, alice);
        _pay(id, bob);
        _pay(id, carol);
        _pay(id, dave);
        t.setBlocked(alice, true); // round-0 recipient cannot receive

        uint256 aliceBefore = t.balanceOf(alice);
        vm.expectEmit(true, true, false, true, address(ajo));
        emit AjoCircle.PayoutDeferred(id, alice, 4 * AMT);
        _settle(id); // must not revert

        assertEq(ajo.currentRecipient(id), bob, "round advanced despite failed push");
        assertEq(t.balanceOf(alice), aliceBefore);
        assertEq(ajo.pendingWithdrawal(id, alice), 4 * AMT);
        (,,,, uint256 pending) = ajo.getMemberInfo(id, alice);
        assertEq(pending, 4 * AMT);
        assertEq(t.balanceOf(address(ajo)), 4 * AMT + 4 * AMT, "pot (deferred) + collateral held");

        // Withdraw fails while blocked, credit retained.
        vm.prank(alice);
        vm.expectRevert();
        ajo.withdraw(id);
        assertEq(ajo.pendingWithdrawal(id, alice), 4 * AMT);

        // Nothing to withdraw for someone else.
        vm.prank(bob);
        vm.expectRevert(AjoCircle.NothingToWithdraw.selector);
        ajo.withdraw(id);

        t.setBlocked(alice, false);
        vm.expectEmit(true, true, false, true, address(ajo));
        emit AjoCircle.Withdrawn(id, alice, 4 * AMT);
        vm.prank(alice);
        ajo.withdraw(id);
        assertEq(t.balanceOf(alice), aliceBefore + 4 * AMT);
        assertEq(ajo.pendingWithdrawal(id, alice), 0);

        vm.prank(alice);
        vm.expectRevert(AjoCircle.NothingToWithdraw.selector);
        ajo.withdraw(id);
    }

    function test_PayoutDeferred_OnLeaveRefund() public {
        FlakyUSDC t = _useFlaky();
        uint256 id = _create(false, true);
        _joinRest(id);
        t.setBlocked(bob, true);
        vm.expectEmit(true, true, false, true, address(ajo));
        emit AjoCircle.PayoutDeferred(id, bob, AMT);
        vm.prank(bob);
        ajo.leave(id);
        assertEq(ajo.pendingWithdrawal(id, bob), AMT);
        t.setBlocked(bob, false);
        vm.prank(bob);
        ajo.withdraw(id);
        assertEq(t.balanceOf(bob), START_BAL);
        assertEq(t.balanceOf(address(ajo)), 3 * AMT);
    }

    function test_PayoutDeferred_CollateralOnCompletion_CompletionStillSucceeds() public {
        FlakyUSDC t = _useFlaky();
        uint256 id = _activeJoinOrder(true);
        t.setBlocked(carol, true);
        for (uint256 r; r < 4; ++r) {
            _pay(id, alice);
            _pay(id, bob);
            _pay(id, carol);
            _pay(id, dave);
            _settle(id);
        }
        assertEq(uint8(_status(id)), uint8(AjoCircle.Status.Completed));
        // carol was round-2 recipient (pot 4A) + collateral A both deferred
        assertEq(ajo.pendingWithdrawal(id, carol), 5 * AMT);
        assertEq(t.balanceOf(address(ajo)), 5 * AMT);
        t.setBlocked(carol, false);
        vm.prank(carol);
        ajo.withdraw(id);
        assertEq(t.balanceOf(address(ajo)), 0);
        assertEq(t.balanceOf(carol), START_BAL);
    }

    // ---------------- views ----------------

    function test_Views_MembersRecipientHasPaid() public {
        uint256 id = _activeJoinOrder(true);
        assertEq(ajo.getMembers(id).length, 4);
        assertEq(ajo.currentRecipient(id), alice);
        assertFalse(ajo.hasPaid(id, alice));
        _pay(id, alice);
        assertTrue(ajo.hasPaid(id, alice));
        assertFalse(ajo.hasPaidRound(id, 1, alice));
        _pay(id, bob);
        _pay(id, carol);
        _pay(id, dave);
        _settle(id);
        assertEq(ajo.currentRecipient(id), bob);
        assertFalse(ajo.hasPaid(id, alice), "hasPaid tracks current round");
        assertTrue(ajo.hasPaidRound(id, 0, alice), "history retained");
    }

    function test_Views_CircleCountMultipleCircles() public {
        _create(false, true);
        vm.prank(bob);
        uint256 id2 = ajo.createCircle("Other", 5e6, 3, 120, true, false);
        assertEq(id2, 2);
        assertEq(ajo.circleCount(), 2);
        AjoCircle.Circle memory c = ajo.getCircle(2);
        assertEq(c.creator, bob);
        assertTrue(c.randomOrder);
        assertFalse(c.collateralRequired);
        assertEq(c.contributionAmount, 5e6);
    }
}
