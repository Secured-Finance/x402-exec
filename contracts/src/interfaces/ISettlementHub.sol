// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ISettlementHub
 * @notice Settlement Hub Interface - x402 Extended Settlement Framework
 * @dev Provides ability to complete payment verification and business execution in a single contract call
 */
interface ISettlementHub {
    // ===== Events =====
    
    /**
     * @notice Settlement completed event
     * @param contextKey Settlement context ID (idempotency identifier)
     * @param payer Payer address
     * @param token Token contract address
     * @param amount Amount
     * @param hook Hook contract address
     */
    event Settled(
        bytes32 indexed contextKey,
        address indexed payer,
        address indexed token,
        uint256 amount,
        address hook
    );
    
    /**
     * @notice Hook execution completed event
     * @param contextKey Settlement context ID
     * @param hook Hook contract address
     * @param returnData Hook return data
     */
    event HookExecuted(
        bytes32 indexed contextKey,
        address indexed hook,
        bytes returnData
    );
    
    // ===== Core Methods =====
    
    /**
     * @notice Settle and execute Hook (main entry)
     * @dev Atomically complete: verify authorization → transfer → execute business logic
     * 
     * @param token ERC-3009 token contract address
     * @param from Payer address
     * @param value Amount (atomic units)
     * @param validAfter EIP-3009 valid after timestamp
     * @param validBefore EIP-3009 expiration timestamp
     * @param nonce EIP-3009 unique nonce (32 bytes)
     * @param signature EIP-712 signature
     * @param hook Hook contract address (address(0) means no Hook)
     * @param hookData Hook parameters (encoded by resource server)
     * 
     * @dev Requirements:
     *   - Authorization signature is valid
     *   - contextKey is unused (idempotency)
     *   - Hub balance is 0 after Hook execution (no fund holding)
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
    ) external;
    
    // ===== Query Methods =====
    
    /**
     * @notice Check if contextKey has been settled
     * @param contextKey Settlement context ID
     * @return Whether it has been settled
     */
    function isSettled(bytes32 contextKey) external view returns (bool);
    
    /**
     * @notice Calculate contextKey
     * @param from Payer address
     * @param token Token contract address
     * @param nonce EIP-3009 nonce
     * @return contextKey
     */
    function calculateContextKey(
        address from,
        address token,
        bytes32 nonce
    ) external pure returns (bytes32);
}

