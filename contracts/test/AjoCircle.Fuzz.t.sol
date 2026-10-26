// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AjoCircle} from "../AjoCircle.sol";
import {AjoCircleBase} from "./AjoCircle.t.sol";

contract AjoCircleFuzzTest is AjoCircleBase {
    /// Full rotation, everyone pays every round: tokens are conserved and each member nets zero.
    function testFuzz_HappyPath_TokenConservation(uint256 amt, uint256 nSeed, bool coll, bool rnd) public {
        amt = bound(amt, 1, 1e15);
        uint256 n = bound(nSeed, 2, 8);
        (uint256 id, address[] memory ms) = _setupN(n, amt, coll, rnd);
        uint256 startBal = 1e30;
        address[] memory order = ajo.getPayoutOrder(id);

        for (uint256 r; r < n; ++r) {
            assertEq(ajo.currentRecipient(id), order[r]);
            for (uint256 i; i < n; ++i) {
                _pay(id, ms[i]);
            }
            uint256 before = usdc.balanceOf(order[r]);
            _settle(id);
            uint256 extra = (r == n - 1 && coll) ? amt : 0; // last settle also refunds collateral
            assertEq(usdc.balanceOf(order[r]), before + n * amt + extra, "full pot");
        }
        assertEq(uint8(_status(id)), uint8(AjoCircle.Status.Completed));
        assertEq(usdc.balanceOf(address(ajo)), 0);
        for (uint256 i; i < n; ++i) {
            assertEq(usdc.balanceOf(ms[i]), startBal, "net zero");
        }
    }

    /// One member defaults every round: contract balance is always fully accounted for and ends at 0.
    function testFuzz_Defaulter_Conservation(uint256 amt, uint256 nSeed, bool coll) public {
        amt = bound(amt, 1, 1e15);
        uint256 n = bound(nSeed, 2, 8);
        (uint256 id, address[] memory ms) = _setupN(n, amt, coll, false);
        address defaulter = ms[n - 1];
        uint256 total = usdc.balanceOf(address(ajo));
        for (uint256 i; i < n; ++i) {
            total += usdc.balanceOf(ms[i]);
        }
        for (uint256 r; r < n; ++r) {
            for (uint256 i; i < n - 1; ++i) {
                _pay(id, ms[i]);
            }
            vm.warp(_deadline(id));
            _settle(id);
        }
        assertEq(uint8(_status(id)), uint8(AjoCircle.Status.Completed));
        assertEq(usdc.balanceOf(address(ajo)), 0);
        uint256 after_;
        for (uint256 i; i < n; ++i) {
            after_ += usdc.balanceOf(ms[i]);
        }
        assertEq(after_, total, "no tokens created or lost");
        (,, bool dflt, uint256 defaults,) = ajo.getMemberInfo(id, defaulter);
        assertTrue(dflt);
        assertEq(defaults, n);
    }

    /// Random draw is always a permutation of the members.
    function testFuzz_RandomDrawIsPermutation(uint256 nSeed, uint256 rollBy) public {
        uint256 n = bound(nSeed, 2, 12);
        rollBy = bound(rollBy, 1, 200 - 3);
        (, address[] memory ms) = _setupN(n, 1e6, false, false);
        // Fresh random circle (the helper's own circle is join-order; build a second one).
        vm.prank(ms[0]);
        uint256 rid = ajo.createCircle("R", 1e6, n, DUR, true, false);
        for (uint256 i = 1; i < n; ++i) {
            vm.prank(ms[i]);
            ajo.join(rid);
        }
        vm.prank(ms[0]);
        ajo.start(rid);
        vm.roll(ajo.getCircle(rid).seedBlock + rollBy);
        ajo.finalizeDraw(rid);
        address[] memory order = ajo.getPayoutOrder(rid);
        assertEq(order.length, n);
        for (uint256 i; i < n; ++i) {
            uint256 hits;
            for (uint256 j; j < n; ++j) {
                if (order[j] == ms[i]) ++hits;
            }
            assertEq(hits, 1);
        }
    }
}
