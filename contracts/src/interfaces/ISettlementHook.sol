// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ISettlementHook
 * @notice Interface for settlement hooks that execute business logic after payment
 * @dev Hooks are called by SettlementHub after consuming EIP-3009 authorization
 */
interface ISettlementHook {
    /**
     * @notice Executes the hook's business logic
     * @dev Called by SettlementHub with approved token amount
     * @param contextKey Unique identifier for this settlement (based on EIP-3009 nonce)
     * @param payer Address that signed the EIP-3009 authorization
     * @param token Address of the payment token (e.g., USDC)
     * @param amount Amount of tokens authorized (in token's decimals)
     * @param data ABI-encoded hook-specific parameters
     * @return result ABI-encoded result data (optional)
     */
    function execute(
        bytes32 contextKey,
        address payer,
        address token,
        uint256 amount,
        bytes calldata data
    ) external returns (bytes memory result);
}

