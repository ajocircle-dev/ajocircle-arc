// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {AjoCircle} from "../AjoCircle.sol";
import {AjoCircleBase, MockUSDC} from "./AjoCircle.t.sol";

/// @dev Drives a circle with arbitrary pay / settle / warp sequences.
contract AjoHandler is Test {
    AjoCircle public ajo;
    uint256 public id;
    address[] public ms;

    constructor(AjoCircle ajo_, uint256 id_, address[] memory ms_) {
        ajo = ajo_;
        id = id_;
        ms = ms_;
    }

    function pay(uint256 i) external {
        vm.prank(ms[i % ms.length]);
        try ajo.contribute(id) {} catch {}
    }

    function settle() external {
        try ajo.settleRound(id) {} catch {}
    }

    function warpTo(uint256 s) external {
        s = bound(s, 1, 2 days);
        vm.warp(block.timestamp + s);
    }

    function members() external view returns (address[] memory) {
        return ms;
    }
}

contract AjoCircleInvariantTest is AjoCircleBase {
    AjoHandler internal handler;
    uint256 internal id;
    uint256 internal totalMinted;

    function setUp() public override {
        super.setUp();
        totalMinted = 4 * START_BAL;
        id = _activeJoinOrder(true);
        address[] memory ms = new address[](4);
        ms[0] = alice;
        ms[1] = bob;
        ms[2] = carol;
        ms[3] = dave;
        handler = new AjoHandler(ajo, id, ms);
        targetContract(address(handler));
        bytes4[] memory sels = new bytes4[](3);
        sels[0] = AjoHandler.pay.selector;
        sels[1] = AjoHandler.settle.selector;
        sels[2] = AjoHandler.warpTo.selector;
        targetSelector(FuzzSelector({addr: address(handler), selectors: sels}));
    }

    /// Token balance is exactly: remaining collateral + deferred credits + not-yet-settled contributions.
    function invariant_ContractBalanceFullyAccounted() public view {
        uint256 owed;
        address[4] memory ms = [alice, bob, carol, dave];
        for (uint256 i; i < 4; ++i) {
            (, uint256 col,,, uint256 pending) = ajo.getMemberInfo(id, ms[i]);
            owed += col + pending;
        }
        AjoCircle.Circle memory c = ajo.getCircle(id);
        if (c.status == AjoCircle.Status.Active) owed += c.paidCount * AMT;
        assertEq(usdc.balanceOf(address(ajo)), owed);
    }

    /// No tokens are created or destroyed.
    function invariant_TokenSupplyConserved() public view {
        uint256 sum = usdc.balanceOf(address(ajo));
        sum += usdc.balanceOf(alice) + usdc.balanceOf(bob) + usdc.balanceOf(carol) + usdc.balanceOf(dave);
        assertEq(sum, totalMinted);
        assertEq(usdc.totalSupply(), totalMinted);
    }

    /// Once complete, the contract holds nothing.
    function invariant_CompletedMeansDrained() public view {
        if (ajo.getCircle(id).status == AjoCircle.Status.Completed) {
            assertEq(usdc.balanceOf(address(ajo)), 0);
        }
    }
}
