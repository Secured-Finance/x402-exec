// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {SettlementHub} from "../src/SettlementHub.sol";
import {RevenueSplitHook} from "../examples/revenue-split/RevenueSplitHook.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";
import {MockFailingHook, MockSimpleHook} from "./mocks/MockHooks.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title SettlementHubTest
 * @notice Test SettlementHub core functionality
 */
contract SettlementHubTest is Test {
    SettlementHub public hub;
    RevenueSplitHook public splitHook;
    MockUSDC public token;
    MockFailingHook public failingHook;
    MockSimpleHook public simpleHook;
    
    address public payer;
    address public merchant;
    address public platform;
    
    uint256 constant AMOUNT = 1000000; // 1 USDC (6 decimals)
    uint256 constant VALID_AFTER = 0;
    uint256 constant VALID_BEFORE = type(uint256).max;
    
    event Settled(
        bytes32 indexed contextKey,
        address indexed payer,
        address indexed token,
        uint256 amount,
        address hook
    );
    
    event HookExecuted(
        bytes32 indexed contextKey,
        address indexed hook,
        bytes returnData
    );
    
    function setUp() public {
        // Deploy contracts
        hub = new SettlementHub();
        token = new MockUSDC();
        splitHook = new RevenueSplitHook(address(hub));
        failingHook = new MockFailingHook(address(hub));
        simpleHook = new MockSimpleHook(address(hub));
        
        // Setup accounts
        payer = makeAddr("payer");
        merchant = makeAddr("merchant");
        platform = makeAddr("platform");
        
        // Mint tokens to payer
        token.mint(payer, 10 * AMOUNT);
    }
    
    function testCalculateContextKey() public {
        address from = address(0x1);
        address tokenAddr = address(0x2);
        bytes32 nonce = bytes32(uint256(1));
        
        bytes32 contextKey = hub.calculateContextKey(from, tokenAddr, nonce);
        bytes32 expected = keccak256(abi.encodePacked(from, tokenAddr, nonce));
        
        assertEq(contextKey, expected);
    }
    
    function testIsSettled() public {
        bytes32 contextKey = keccak256("test");
        
        // Initial state: not settled
        assertFalse(hub.isSettled(contextKey));
        
        // We cannot directly set settled state here as it is private
        // Need to test through actual settleAndExecute calls
    }
    
    function testSettleAndExecuteWithSimpleHook() public {
        bytes32 nonce = bytes32(uint256(1));
        bytes memory signature = "mock_signature";
        bytes memory hookData = abi.encode(merchant);
        
        // Calculate contextKey
        bytes32 contextKey = hub.calculateContextKey(payer, address(token), nonce);
        
        // Expected events - note the order of event emission
        vm.expectEmit(true, true, false, true);
        emit HookExecuted(contextKey, address(simpleHook), abi.encode(merchant, AMOUNT));
        
        vm.expectEmit(true, true, true, true);
        emit Settled(contextKey, payer, address(token), AMOUNT, address(simpleHook));
        
        // Execute settlement
        hub.settleAndExecute(
            address(token),
            payer,
            AMOUNT,
            VALID_AFTER,
            VALID_BEFORE,
            nonce,
            signature,
            address(simpleHook),
            hookData
        );
        
        // Verify state
        assertTrue(hub.isSettled(contextKey));
        
        // Verify balances
        assertEq(token.balanceOf(address(hub)), 0); // Hub holds no funds
        assertEq(token.balanceOf(merchant), AMOUNT); // Merchant received funds
        assertEq(token.balanceOf(payer), 9 * AMOUNT); // Payer balance decreased
        
        // Verify nonce is used
        assertTrue(token.authorizationState(payer, nonce));
    }
    
    function testIdempotency() public {
        bytes32 nonce = bytes32(uint256(2));
        bytes memory signature = "mock_signature";
        bytes memory hookData = abi.encode(merchant);
        
        // First call: success
        hub.settleAndExecute(
            address(token),
            payer,
            AMOUNT,
            VALID_AFTER,
            VALID_BEFORE,
            nonce,
            signature,
            address(simpleHook),
            hookData
        );
        
        bytes32 contextKey = hub.calculateContextKey(payer, address(token), nonce);
        assertTrue(hub.isSettled(contextKey));
        
        // Second call: should fail (idempotency)
        vm.expectRevert(
            abi.encodeWithSelector(
                SettlementHub.AlreadySettled.selector,
                contextKey
            )
        );
        
        hub.settleAndExecute(
            address(token),
            payer,
            AMOUNT,
            VALID_AFTER,
            VALID_BEFORE,
            nonce,
            signature,
            address(simpleHook),
            hookData
        );
    }
    
    function testHookFailure() public {
        bytes32 nonce = bytes32(uint256(3));
        bytes memory signature = "mock_signature";
        bytes memory hookData = "";
        
        // Set Hook to failure mode
        failingHook.setShouldFail(true);
        
        // Call should fail
        vm.expectRevert(
            abi.encodeWithSelector(
                SettlementHub.HookExecutionFailed.selector,
                address(failingHook),
                abi.encodeWithSignature("Error(string)", "Mock hook failure")
            )
        );
        
        hub.settleAndExecute(
            address(token),
            payer,
            AMOUNT,
            VALID_AFTER,
            VALID_BEFORE,
            nonce,
            signature,
            address(failingHook),
            hookData
        );
        
        // Verify state: transaction failed, contextKey should not be marked as settled
        bytes32 contextKey = hub.calculateContextKey(payer, address(token), nonce);
        assertFalse(hub.isSettled(contextKey));
        
        // Verify balances: payer balance should not change
        assertEq(token.balanceOf(payer), 10 * AMOUNT);
        assertEq(token.balanceOf(address(hub)), 0);
    }
    
    function testSettleWithoutHook() public {
        bytes32 nonce = bytes32(uint256(4));
        bytes memory signature = "mock_signature";
        
        // No Hook (hook = address(0))
        vm.expectRevert(
            abi.encodeWithSelector(
                SettlementHub.HubShouldNotHoldFunds.selector,
                address(token),
                AMOUNT
            )
        );
        
        hub.settleAndExecute(
            address(token),
            payer,
            AMOUNT,
            VALID_AFTER,
            VALID_BEFORE,
            nonce,
            signature,
            address(0), // No Hook
            ""
        );
    }
    
    function testRevenueSplitHook() public {
        bytes32 nonce = bytes32(uint256(5));
        bytes memory signature = "mock_signature";
        
        // Setup split configuration: 70% to merchant, 30% to platform
        // Note: RevenueSplitHook splits data is directly encoded into hookData
        RevenueSplitHook.Split[] memory splits = new RevenueSplitHook.Split[](2);
        splits[0] = RevenueSplitHook.Split({
            recipient: merchant,
            bips: 7000
        });
        splits[1] = RevenueSplitHook.Split({
            recipient: platform,
            bips: 3000
        });
        
        bytes memory hookData = abi.encode(splits);
        
        // Execute settlement
        hub.settleAndExecute(
            address(token),
            payer,
            AMOUNT,
            VALID_AFTER,
            VALID_BEFORE,
            nonce,
            signature,
            address(splitHook),
            hookData
        );
        
        // Verify split results
        assertEq(token.balanceOf(merchant), 700000); // 70%
        assertEq(token.balanceOf(platform), 300000); // 30%
        assertEq(token.balanceOf(address(hub)), 0); // Hub holds no funds
        assertEq(token.balanceOf(payer), 9 * AMOUNT); // Payer balance decreased
    }
    
    function testInvalidRevenueSplit() public {
        bytes32 nonce = bytes32(uint256(7));
        bytes memory signature = "mock_signature";
        
        // Setup invalid split configuration: total not equal to 100%
        RevenueSplitHook.Split[] memory splits = new RevenueSplitHook.Split[](2);
        splits[0] = RevenueSplitHook.Split({
            recipient: merchant,
            bips: 6000 // 60%
        });
        splits[1] = RevenueSplitHook.Split({
            recipient: platform,
            bips: 3000 // 30%, total 90%
        });
        
        bytes memory hookData = abi.encode(splits);
        
        vm.expectRevert(
            abi.encodeWithSelector(
                SettlementHub.HookExecutionFailed.selector,
                address(splitHook),
                abi.encodeWithSelector(RevenueSplitHook.InvalidTotalBips.selector, 9000)
            )
        );
        hub.settleAndExecute(
            address(token),
            payer,
            AMOUNT,
            VALID_AFTER,
            VALID_BEFORE,
            nonce,
            signature,
            address(splitHook),
            hookData
        );
    }
    
    function testTransferFailed() public {
        bytes32 nonce = bytes32(uint256(6));
        bytes memory signature = "mock_signature";
        bytes memory hookData = abi.encode(merchant);
        
        // Payer doesn't have sufficient balance
        address poorPayer = makeAddr("poorPayer");
        token.mint(poorPayer, AMOUNT / 2); // Only half the amount
        
        vm.expectRevert(); // transferWithAuthorization will fail
        
        hub.settleAndExecute(
            address(token),
            poorPayer,
            AMOUNT,
            VALID_AFTER,
            VALID_BEFORE,
            nonce,
            signature,
            address(simpleHook),
            hookData
        );
    }
}