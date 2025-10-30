// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ISettlementHook} from "../../src/interfaces/ISettlementHook.sol";

/**
 * @notice Interface for reward token distribution
 */
interface IRewardToken {
    function distribute(address to, uint256 amount) external;
}

/**
 * @title RewardHook
 * @notice Settlement hook that transfers payment to merchant and distributes reward tokens
 * @dev Used in Scenario 3: Points Reward showcase
 * 
 * Flow:
 * 1. Receive payment authorization from SettlementHub
 * 2. Transfer USDC to merchant
 * 3. Calculate reward points based on payment amount
 * 4. Distribute reward points to payer
 * 
 * Reward Rate:
 * - 1000 points per $0.1 USDC (0.1 USDC = 100,000 in 6 decimals)
 * - Example: Pay $0.1 → Get 1000 points
 */
contract RewardHook is ISettlementHook {
    using SafeERC20 for IERC20;
    
    
    // ===== Constants & Immutables =====
    
    /// @notice Address of the SettlementHub contract
    address public immutable settlementHub;
    
    /// @notice Address of the reward token contract
    address public immutable rewardToken;
    
    /// @notice Reward rate: points per $0.1 USDC
    /// @dev For 0.1 USDC (100,000 in 6 decimals), user gets 1000 points (1000 * 10^18)
    uint256 public constant REWARD_RATE = 1000;
    
    // ===== Events =====
    
    /// @notice Emitted when payment is processed and rewards are distributed
    event RewardDistributed(
        bytes32 indexed contextKey,
        address indexed payer,
        address indexed merchant,
        uint256 paymentAmount,
        uint256 rewardPoints
    );
    
    // ===== Errors =====
    
    error OnlyHub();
    
    // ===== Modifiers =====
    
    modifier onlyHub() {
        if (msg.sender != settlementHub) revert OnlyHub();
        _;
    }
    
    // ===== Constructor =====
    
    /**
     * @notice Initializes the reward hook
     * @param _settlementHub Address of the SettlementHub contract
     * @param _rewardToken Address of the reward token contract
     */
    constructor(address _settlementHub, address _rewardToken) {
        require(_settlementHub != address(0), "Invalid hub address");
        require(_rewardToken != address(0), "Invalid token address");
        settlementHub = _settlementHub;
        rewardToken = _rewardToken;
    }
    
    // ===== External Functions =====
    
    /**
     * @notice Executes the reward distribution logic
     * @dev Called by SettlementHub during settleAndExecute
     * @param contextKey Unique identifier for this settlement
     * @param payer Address of the payment sender
     * @param token Address of the payment token (USDC)
     * @param amount Payment amount in token's decimals (6 for USDC)
     * @param data ABI-encoded merchant address
     * @return Encoded reward points amount
     */
    function execute(
        bytes32 contextKey,
        address payer,
        address token,
        uint256 amount,
        bytes calldata data
    ) external onlyHub returns (bytes memory) {
        // Decode merchant address from hook data
        address merchant = abi.decode(data, (address));
        require(merchant != address(0), "Invalid merchant address");
        
        // 1. Transfer payment to merchant
        IERC20(token).safeTransferFrom(settlementHub, merchant, amount);
        
        // 2. Calculate reward points
        // amount is in 6 decimals (USDC), reward is in 18 decimals (ERC20)
        // For 0.1 USDC (100,000), user gets 1000 points (1000 * 10^18)
        uint256 rewardPoints = (amount * REWARD_RATE * 10**18) / 100_000;
        
        // 3. Distribute reward points to payer
        IRewardToken(rewardToken).distribute(payer, rewardPoints);
        
        emit RewardDistributed(contextKey, payer, merchant, amount, rewardPoints);
        
        // Return reward points for off-chain tracking
        return abi.encode(rewardPoints);
    }
}

