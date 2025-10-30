# Reward Points Scenario

This scenario demonstrates customer loyalty and reward point systems.

## Contracts

### `RewardHook.sol`
**Purpose**: Transfer payment to merchant and distribute reward points to customer

**Flow**:
1. User makes payment
2. Payment is transferred to merchant
3. Reward points are calculated and distributed to user

**Reward Calculation**:
- Rate: 1000 points per $0.1 USDC
- Formula: `(amount * REWARD_RATE * 10^18) / 100_000`
- Example: Pay $0.1 USDC → Get 1000 points

**Configuration**:
```solidity
constructor(address _settlementHub, address _rewardToken) {
    settlementHub = _settlementHub;
    rewardToken = _rewardToken;
}

// hookData format: abi.encode(merchantAddress)
```

### `RewardToken.sol`
**Purpose**: ERC20 reward points token with controlled distribution

**Features**:
- Fixed supply of 1,000,000 tokens
- All tokens initially held by contract
- Only designated hook can distribute tokens
- One-time hook setup for security

**Key Functions**:
```solidity
function distribute(address to, uint256 amount) external;
function remainingRewards() external view returns (uint256);
```

## Deployment Example

```solidity
// 1. Deploy RewardToken
RewardToken rewardToken = new RewardToken();

// 2. Deploy RewardHook
RewardHook hook = new RewardHook(settlementHub, address(rewardToken));

// 3. Set Hook as token distributor
rewardToken.setRewardHook(address(hook));

// 4. Configure hookData for each transaction
bytes memory hookData = abi.encode(merchantAddress);
```

## Reward Calculation Examples

| Payment Amount (USDC) | Amount in Wei | Reward Points |
|----------------------|---------------|---------------|
| $0.1                 | 100,000       | 1,000         |
| $1.0                 | 1,000,000     | 10,000        |
| $10.0                | 10,000,000    | 100,000       |

## Use Cases

- **Customer Loyalty Programs**: Points for purchases
- **Cashback Systems**: Token-based cashback rewards
- **Gamification**: Points for user engagement
- **Membership Tiers**: Points-based membership levels
- **Referral Programs**: Reward points for referrals

## Customization Options

### Modify Reward Rate
```solidity
// Change REWARD_RATE constant
uint256 public constant REWARD_RATE = 2000; // 2000 points per $0.1
```

### Dynamic Reward Rates
```solidity
// Add rate configuration to hookData
struct RewardConfig {
    address merchant;
    uint256 rewardRate;  // Custom rate for this transaction
}

bytes memory hookData = abi.encode(RewardConfig({
    merchant: merchantAddress,
    rewardRate: customRate
}));
```

### Multiple Reward Tiers
```solidity
// Implement tier-based rewards
function calculateReward(uint256 amount, address user) internal view returns (uint256) {
    uint256 userTier = getUserTier(user);
    uint256 multiplier = getTierMultiplier(userTier);
    return (amount * REWARD_RATE * multiplier * 10**18) / 100_000;
}
```

## Integration Notes

- Each application should deploy its own RewardToken and RewardHook
- Consider token economics and total supply requirements
- Monitor remaining reward token balance
- Implement additional features like token burning, staking, or redemption
- Consider gas costs for reward distribution
- Add access controls for administrative functions
