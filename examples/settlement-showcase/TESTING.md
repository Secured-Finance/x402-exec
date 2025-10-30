# Settlement Showcase - Testing Guide

## Running Tests

### Smart Contract Tests

```bash
cd contracts

# Run all tests
forge test

# Run with verbose output
forge test -vvv

# Run specific test
forge test --match-test testNFTMint

# Generate gas report
forge test --gas-report

# Generate coverage report
forge coverage
```

### Expected Test Results

All tests should pass:
- ✓ `testNFTMint` - NFT minting works
- ✓ `testNFTMintOnlyMinter` - Only minter can mint
- ✓ `testNFTMaxSupply` - Max supply is enforced
- ✓ `testRewardTokenInitialSupply` - Token supply is correct
- ✓ `testRewardDistribution` - Reward distribution works
- ✓ `testRewardDistributionOnlyHook` - Only hook can distribute
- ✓ `testRewardHookConstants` - Hook constants are correct
- ✓ `testRewardHookCalculation` - Reward calculation is accurate

## Manual End-to-End Testing

### Prerequisites

1. Deploy all contracts
2. Start server and client
3. Get testnet tokens (ETH + USDC)
4. Connect wallet

### Test Scenario 1: Referral Split

**Steps:**
1. Navigate to "Referral Split" tab
2. (Optional) Enter referrer address: `0x...`
3. Click "Pay $0.1 USDC"
4. Sign transaction in MetaMask
5. Wait for confirmation (~2-5 seconds)

**Verification:**
- Check transaction on [Base Sepolia Explorer](https://sepolia.basescan.org/)
- Verify 3 transfers in transaction logs:
  - 70% (0.07 USDC) → Merchant
  - 20% (0.02 USDC) → Referrer
  - 10% (0.01 USDC) → Platform
- Check `Settled` event from SettlementHub

### Test Scenario 2: Random NFT Mint

**Steps:**
1. Navigate to "NFT Mint" tab
2. Note the current supply (e.g., 5/1000)
3. Click "Mint NFT for $0.1 USDC"
4. Sign transaction in MetaMask
5. Wait for confirmation

**Verification:**
- Check wallet for new NFT
- NFT should be RandomNFT #N (sequential)
- View on OpenSea Testnet:
  - Go to `https://testnets.opensea.io/assets/base-sepolia/{NFT_CONTRACT_ADDRESS}/{TOKEN_ID}`
- Check supply increased to 6/1000

### Test Scenario 3: Points Reward

**Steps:**
1. Navigate to "Points Reward" tab
2. Note remaining rewards (e.g., 999,000)
3. Click "Earn 1000 Points for $0.1 USDC"
4. Sign transaction in MetaMask
5. Wait for confirmation

**Verification:**
- Check wallet for 1000 POINTS tokens
  - Add token to MetaMask: `{REWARD_TOKEN_ADDRESS}`
- Check remaining rewards decreased to 998,000
- Verify merchant received 0.1 USDC

## Integration Testing Checklist

### Server API Tests

```bash
cd server

# Test health endpoint
curl http://localhost:3001/api/health

# Test scenarios endpoint
curl http://localhost:3001/api/scenarios

# Test scenario 1 info
curl http://localhost:3001/api/scenario-1/info

# Test scenario 2 info
curl http://localhost:3001/api/scenario-2/info

# Test scenario 3 info
curl http://localhost:3001/api/scenario-3/info
```

Expected responses:
- All endpoints should return 200 OK
- JSON responses with correct structure
- No error messages

### Frontend Tests

**Wallet Connection:**
- [ ] Connect wallet button visible when not connected
- [ ] Wallet address displayed after connection
- [ ] Disconnect button works
- [ ] Connection persists on page reload

**Tab Navigation:**
- [ ] All 3 tabs clickable
- [ ] Active tab highlighted
- [ ] Content changes when switching tabs
- [ ] No console errors

**Payment Flow:**
- [ ] Pay button disabled when wallet not connected
- [ ] Payment status updates (preparing → paying → success/error)
- [ ] Success message displayed after payment
- [ ] "Make Another Payment" button resets state
- [ ] Error messages displayed on failure

## Common Issues & Solutions

### Issue: "Failed to connect wallet"

**Solution:**
- Ensure MetaMask is installed
- Switch to Base Sepolia network
- Refresh the page

### Issue: "Insufficient funds"

**Solution:**
- Get testnet ETH from [Coinbase Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
- Get testnet USDC from [Circle Faucet](https://faucet.circle.com/)

### Issue: "Max supply reached"

**Solution:**
- For NFT: Deploy a new RandomNFT contract
- For Rewards: Deploy a new RewardToken contract
- Update `.env` with new addresses

### Issue: "Transaction reverted"

**Possible causes:**
- Insufficient gas
- Contract not configured correctly
- Hook not authorized
- Try with more gas: MetaMask → Advanced → Edit Gas Limit

### Issue: "Payment stuck in 'paying' state"

**Solution:**
- Check MetaMask for pending transaction
- Confirm or reject the transaction
- Refresh the page

## Performance Testing

### Expected Response Times

- API health check: < 100ms
- Scenario info: < 200ms (includes contract call)
- Payment preparation: < 500ms
- Transaction confirmation: 2-5 seconds (blockchain dependent)

### Load Testing

```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Test health endpoint
ab -n 1000 -c 10 http://localhost:3001/api/health

# Expected results:
# - Requests per second: > 100
# - Mean time per request: < 100ms
# - No failed requests
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Test Contracts

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install Foundry
        uses: foundry-rs/foundry-toolchain@v1
      - name: Run tests
        run: |
          cd examples/settlement-showcase/contracts
          forge test
```

## Security Testing

### Smart Contract Audit Checklist

- [ ] Run Slither: `slither contracts/src/`
- [ ] Check for reentrancy vulnerabilities
- [ ] Verify access control (onlyHub, onlyMinter modifiers)
- [ ] Test overflow/underflow (should be safe with Solidity 0.8+)
- [ ] Validate input parameters
- [ ] Test edge cases (max supply, zero amounts, etc.)

### Server Security

- [ ] No private keys in code or logs
- [ ] Environment variables properly loaded
- [ ] CORS configured correctly
- [ ] Rate limiting implemented (production)
- [ ] Input validation on all endpoints

## Monitoring & Logging

### Production Monitoring

Monitor these metrics:
- Transaction success rate (> 95%)
- Average confirmation time (< 10s)
- API response time (< 500ms)
- Contract gas usage (< 300k gas)
- Error rate (< 1%)

### Logging Best Practices

```typescript
// Log important events
console.log('Payment initiated:', { 
  scenario, 
  amount, 
  userAddress 
});

// Log errors with context
console.error('Payment failed:', {
  error: err.message,
  scenario,
  userAddress
});
```

## Troubleshooting Deployed Contracts

### Verify Contract State

```bash
# Check NFT supply
cast call $RANDOM_NFT_ADDRESS "totalSupply()" --rpc-url $RPC_URL

# Check remaining rewards
cast call $REWARD_TOKEN_ADDRESS "remainingRewards()" --rpc-url $RPC_URL

# Check minter address
cast call $RANDOM_NFT_ADDRESS "minter()" --rpc-url $RPC_URL
```

### Expected Results

- RandomNFT total supply: 0-1000
- RewardToken remaining: 0-1,000,000 * 10^18
- Minter should be NFTMintHook address

---

For more help, see the [main README](../README.md) or [open an issue](https://github.com/nuwa-protocol/x402_settle/issues).

