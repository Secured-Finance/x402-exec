// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {ISettlementHub} from "./interfaces/ISettlementHub.sol";
import {ISettlementHook} from "./interfaces/ISettlementHook.sol";
import {IERC3009} from "./interfaces/IERC3009.sol";

/**
 * @title SettlementHub
 * @notice x402 Extended Settlement Hub - Implements atomic payment verification and business execution
 * @dev Core design:
 *   1. Single contract call completes all operations (no Multicall3 needed)
 *   2. Minimal protocol layer (only 3 extra fields)
 *   3. All business logic extended through Hooks
 *   4. No fund holding (instant transfer)
 * 
 * @custom:security-contact security@x402settlement.org
 */
contract SettlementHub is ISettlementHub, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // ===== State Variables =====
    
    /// @notice Settlement marker (idempotency guarantee)
    /// @dev contextKey => whether settled
    mapping(bytes32 => bool) public settled;
    
    // ===== Error Definitions =====
    
    error AlreadySettled(bytes32 contextKey);
    error TransferFailed(address token, uint256 expected, uint256 actual);
    error HubShouldNotHoldFunds(address token, uint256 balance);
    error HookExecutionFailed(address hook, bytes reason);
    
    // ===== Core Functions =====
    
    /**
     * @inheritdoc ISettlementHub
     * @dev Execution flow:
     *   1. Calculate contextKey (idempotency identifier)
     *   2. Check idempotency (prevent duplicate settlement)
     *   3. Mark as settled (CEI pattern)
     *   4. Call token.transferWithAuthorization (funds enter Hub)
     *   5. Verify balance (ensure transfer success)
     *   6. Approve and call Hook (execute business logic)
     *   7. Verify balance is 0 (ensure no fund holding)
     *   8. Emit events
     */
    function settleAndExecute(
        address token,
        address from,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        bytes calldata signature,
        address hook,
        bytes calldata hookData
    ) external nonReentrant {
        // 1. Calculate contextKey
        bytes32 contextKey = calculateContextKey(from, token, nonce);
        
        // 2. Idempotency check
        if (settled[contextKey]) {
            revert AlreadySettled(contextKey);
        }
        
        // 3. Mark as settled (CEI pattern: modify state first)
        settled[contextKey] = true;
        
        // 4. Call token.transferWithAuthorization
        // Note: signature verification and nonce check are done by token contract
        IERC3009(token).transferWithAuthorization(
            from,
            address(this),  // Funds enter Hub first
            value,
            validAfter,
            validBefore,
            nonce,
            signature
        );
        
        // 5. Verify balance (ensure transfer success)
        uint256 balanceBefore = IERC20(token).balanceOf(address(this));
        if (balanceBefore < value) {
            revert TransferFailed(token, value, balanceBefore);
        }
        
        // 6. Call Hook (if any)
        if (hook != address(0)) {
            // Approve Hook to use funds
            IERC20(token).forceApprove(hook, value);
            
            // Execute Hook
            bytes memory result;
            try ISettlementHook(hook).execute(
                contextKey,
                from,
                token,
                value,
                hookData
            ) returns (bytes memory _result) {
                result = _result;
                emit HookExecuted(contextKey, hook, result);
            } catch (bytes memory reason) {
                revert HookExecutionFailed(hook, reason);
            }
        }
        
        // 7. Ensure Hub holds no funds (all funds should be distributed or returned by Hook)
        uint256 balanceAfter = IERC20(token).balanceOf(address(this));
        if (balanceAfter != 0) {
            revert HubShouldNotHoldFunds(token, balanceAfter);
        }
        
        // 8. Emit events
        emit Settled(contextKey, from, token, value, hook);
    }
    
    // ===== Query Methods =====
    
    /**
     * @inheritdoc ISettlementHub
     */
    function isSettled(bytes32 contextKey) external view returns (bool) {
        return settled[contextKey];
    }
    
    /**
     * @inheritdoc ISettlementHub
     */
    function calculateContextKey(
        address from,
        address token,
        bytes32 nonce
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(from, token, nonce));
    }
}

