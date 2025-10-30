## SettlementHub Contract API Documentation

### Contract Addresses

| Network | Address | Status |
|---------|---------|--------|
| Base Sepolia | TBD | To be deployed |
| Base Mainnet | TBD | To be deployed |

### Core Interfaces

#### `settleAndExecute`

```solidity
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
) external
```

**Description**: Atomically execute payment verification and business logic

**Parameters**:
- `token`: ERC-3009 token contract address (e.g., USDC)
- `from`: Payer address
- `value`: Amount (atomic units, e.g., 6 decimals for USDC)
- `validAfter`: EIP-3009 valid after timestamp (0 means immediately)
- `validBefore`: EIP-3009 expiration timestamp
- `nonce`: EIP-3009 unique nonce (32 bytes)
- `signature`: EIP-712 signature
- `hook`: Hook contract address (address(0) means no Hook)
- `hookData`: Hook parameters (encoded by resource server)

**Events**:
- `Settled(bytes32 contextKey, address payer, address token, uint256 amount, address hook)`
- `HookExecuted(bytes32 contextKey, address hook, bytes returnData)`

**Errors**:
- `AlreadySettled(bytes32 contextKey)`: contextKey already used
- `TransferFailed(address token, uint256 expected, uint256 actual)`: Transfer failed
- `HubShouldNotHoldFunds(address token, uint256 balance)`: Hub holds balance
- `HookExecutionFailed(address hook, bytes reason)`: Hook execution failed

#### `isSettled`

```solidity
function isSettled(bytes32 contextKey) external view returns (bool)
```

**Description**: Check if contextKey has been settled

**Parameters**:
- `contextKey`: Settlement context ID

**Returns**:
- `bool`: Whether it has been settled

#### `calculateContextKey`

```solidity
function calculateContextKey(
    address from,
    address token,
    bytes32 nonce
) external pure returns (bytes32)
```

**Description**: Calculate contextKey

**Parameters**:
- `from`: Payer address
- `token`: Token contract address
- `nonce`: EIP-3009 nonce

**Returns**:
- `bytes32`: contextKey = keccak256(abi.encodePacked(from, token, nonce))

### State Variables

#### `settled`

```solidity
mapping(bytes32 => bool) public settled
```

**Description**: Settlement marker (idempotency guarantee)

### Execution Flow

```
1. Calculate contextKey
   ↓
2. Check idempotency (require(!settled[contextKey]))
   ↓
3. Mark as settled (CEI pattern)
   ↓
4. Call token.transferWithAuthorization (funds enter Hub)
   ↓
5. Verify balance ≥ value
   ↓
6. Approve and call hook.execute (if hook != 0)
   ↓
7. Verify balance == 0 (ensure no fund holding)
   ↓
8. Emit Settled event
```

### Security Mechanisms

1. **Reentrancy Protection**: Uses OpenZeppelin ReentrancyGuard
2. **Idempotency**: Prevents duplicate settlement through `settled` mapping
3. **CEI Pattern**: Modify state first, then call external contracts
4. **Balance Verification**:
   - Verify balance ≥ value after transfer
   - Verify balance == 0 after Hook execution
5. **Error Propagation**: Hook failure causes entire transaction to revert

### Gas Consumption

| Operation | First Time | Repeat (Idempotent) |
|-----------|------------|-------------------|
| Storage write (settled) | ~20k | ~5k |
| transferWithAuthorization | ~60k | - |
| Hook call | ~50k-200k | - |
| Total | ~130k-280k | ~5k |

### Usage Examples

#### Calling from Facilitator

```typescript
const settlementHub = new ethers.Contract(
  SETTLEMENT_HUB_ADDRESS,
  SETTLEMENT_HUB_ABI,
  signer
);

const tx = await settlementHub.settleAndExecute(
  tokenAddress,
  from,
  value,
  validAfter,
  validBefore,
  nonce,
  signature,
  hookAddress,
  hookData,
  {
    gasLimit: 300000  // Adjust based on Hook complexity
  }
);

const receipt = await tx.wait();
console.log('Transaction hash:', receipt.transactionHash);
```

#### Query Settlement Status

```typescript
const contextKey = ethers.keccak256(
  ethers.solidityPacked(
    ['address', 'address', 'bytes32'],
    [from, token, nonce]
  )
);

const isSettled = await settlementHub.isSettled(contextKey);
console.log('Is settled:', isSettled);
```

### Event Listening

```typescript
settlementHub.on('Settled', (contextKey, payer, token, amount, hook, event) => {
  console.log('Settlement completed:', {
    contextKey,
    payer,
    token,
    amount: amount.toString(),
    hook,
    txHash: event.transactionHash
  });
});

settlementHub.on('HookExecuted', (contextKey, hook, returnData, event) => {
  console.log('Hook executed:', {
    contextKey,
    hook,
    returnData,
    txHash: event.transactionHash
  });
});
```

### Error Handling

```typescript
try {
  const tx = await settlementHub.settleAndExecute(...);
  await tx.wait();
} catch (error) {
  if (error.message.includes('AlreadySettled')) {
    console.error('This payment has already been settled');
  } else if (error.message.includes('TransferFailed')) {
    console.error('Token transfer failed - check balance and allowance');
  } else if (error.message.includes('HubShouldNotHoldFunds')) {
    console.error('Hook did not consume all funds');
  } else if (error.message.includes('HookExecutionFailed')) {
    console.error('Hook execution failed:', error);
  } else {
    console.error('Unknown error:', error);
  }
}
```

### On-chain Verification

Verify contract using Etherscan or Basescan:

```bash
forge verify-contract <address> SettlementHub \
  --chain-id 84532 \
  --watch
```

### Audit Status

- [ ] Internal audit
- [ ] Third-party audit
- [ ] Bug bounty

### Changelog

#### v1.0.0 (To be released)
- Initial version
- Support for EIP-3009 authorization
- Hook extension mechanism
- Idempotency guarantee