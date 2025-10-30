# Facilitator Developer Guide

## Overview

This guide explains how to extend any x402 Facilitator implementation to support the x402 settlement extension framework. The guide provides language-agnostic concepts and examples in multiple programming languages.

## What is a Facilitator?

A Facilitator is a service that processes x402 payment requests by:
1. Validating payment requirements
2. Executing blockchain transactions
3. Returning settlement results

## Settlement Extension Framework

The x402 settlement extension allows Facilitators to support advanced payment flows through:
- **SettlementHub**: A smart contract that coordinates payments and executes hooks
- **Hooks**: Custom logic executed after payment settlement
- **Extended Parameters**: Additional configuration in the `extra` field

## Core Implementation Concepts

### 1. Detection Logic

Your Facilitator needs to detect when a payment request requires settlement extension by checking the `extra` field in `PaymentRequirements`:

**Required Fields in `extra`:**
```json
{
  "settlementHub": "0x...",  // SettlementHub contract address
  "hook": "0x...",           // Hook contract address  
  "hookData": "0x..."        // Encoded hook parameters
}
```

**Detection Logic:**

```pseudocode
function isSettlementMode(paymentRequirements):
    return paymentRequirements.extra.settlementHub exists
```

### 2. Settlement Flow Routing

Modify your main settlement method to route between standard and extended modes:

**Flow Diagram:**
```
Payment Request
       ↓
   Check extra.settlementHub
       ↓
   ┌─────────────────┐
   │ settlementHub?  │
   └─────────────────┘
       ↓         ↓
    Yes │       │ No
       ↓         ↓
Settlement    Standard
   Hub         Transfer
```

**Implementation Logic:**

```pseudocode
function settle(request):
    if isSettlementMode(request.paymentRequirements):
        return settleWithHub(request)
    else:
        return settleStandard(request)
```

### 3. SettlementHub Integration

When settlement mode is detected, call `SettlementHub.settleAndExecute` instead of direct token transfer:

**Standard vs Settlement Mode:**

| Mode | Target Contract | Method | Parameters |
|------|----------------|--------|------------|
| Standard | ERC-3009 Token | `transferWithAuthorization` | token, from, to, value, validAfter, validBefore, nonce, signature |
| Settlement | SettlementHub | `settleAndExecute` | **same as above** + hook, hookData |

**Key Insight:** Settlement mode uses the same authorization parameters but adds hook execution!

### 4. Parameter Extraction

Parse the `extra` field to extract settlement parameters:

**Data Structure:**
```json
{
  "extra": {
    "settlementHub": "0x1234...",
    "hook": "0x5678...", 
    "hookData": "0xabcd..."
  }
}
```

**Parsing Logic:**

```pseudocode
function parseSettlementExtra(extra):
    validate extra.settlementHub exists
    validate extra.hook exists  
    validate extra.hookData exists
    
    return {
        settlementHub: extra.settlementHub,
        hook: extra.hook,
        hookData: extra.hookData
    }
```

### 5. Smart Contract Interaction

Call the SettlementHub contract with the extracted parameters:

**Contract ABI:**
```solidity
function settleAndExecute(
    address token,      // ERC-3009 token address
    address from,       // Payer address
    uint256 value,      // Payment amount
    uint256 validAfter, // Authorization valid after
    uint256 validBefore,// Authorization valid before  
    bytes32 nonce,      // Authorization nonce
    bytes signature,    // Authorization signature
    address hook,       // Hook contract address
    bytes hookData      // Hook execution data
) external;
```

**Settlement Logic:**

```pseudocode
function settleWithHub(request):
    // 1. Parse parameters
    extra = parseSettlementExtra(request.paymentRequirements.extra)
    payload = request.paymentPayload
    
    // 2. Create contract instance
    settlementHub = createContract(extra.settlementHub, SETTLEMENT_HUB_ABI)
    
    // 3. Call settleAndExecute
    transaction = settlementHub.settleAndExecute(
        request.paymentRequirements.asset,    // token
        payload.authorization.from,           // from
        payload.authorization.value,          // value
        payload.authorization.validAfter,     // validAfter
        payload.authorization.validBefore,    // validBefore
        payload.authorization.nonce,          // nonce
        payload.signature,                    // signature
        extra.hook,                          // hook
        extra.hookData                       // hookData
    )
    
    // 4. Wait for confirmation and return result
    receipt = waitForTransaction(transaction)
    return createSuccessResponse(receipt)
```

## SettlementHub Contract Interface

### Core Functions

```solidity
interface ISettlementHub {
    /// @notice Settle payment and execute hook
    function settleAndExecute(
        address token,
        address from, 
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        bytes signature,
        address hook,
        bytes hookData
    ) external;
    
    /// @notice Check if payment is settled
    function isSettled(bytes32 contextKey) external view returns (bool);
}
```

### Events

```solidity
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
```

### ABI JSON

```json
[
  {
    "type": "function",
    "name": "settleAndExecute",
    "inputs": [
      {"name": "token", "type": "address"},
      {"name": "from", "type": "address"},
      {"name": "value", "type": "uint256"},
      {"name": "validAfter", "type": "uint256"},
      {"name": "validBefore", "type": "uint256"},
      {"name": "nonce", "type": "bytes32"},
      {"name": "signature", "type": "bytes"},
      {"name": "hook", "type": "address"},
      {"name": "hookData", "type": "bytes"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "isSettled",
    "inputs": [{"name": "contextKey", "type": "bytes32"}],
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "Settled",
    "inputs": [
      {"name": "contextKey", "type": "bytes32", "indexed": true},
      {"name": "payer", "type": "address", "indexed": true},
      {"name": "token", "type": "address", "indexed": true},
      {"name": "amount", "type": "uint256", "indexed": false},
      {"name": "hook", "type": "address", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "HookExecuted",
    "inputs": [
      {"name": "contextKey", "type": "bytes32", "indexed": true},
      {"name": "hook", "type": "address", "indexed": true},
      {"name": "returnData", "type": "bytes", "indexed": false}
    ]
  }
]
```

## Testing Strategy

### Unit Tests

Test the detection and parsing logic:

```pseudocode
test "detects settlement mode":
    requirements = { extra: { settlementHub: "0x1234..." } }
    assert isSettlementMode(requirements) == true

test "detects standard mode":
    requirements = { extra: null }
    assert isSettlementMode(requirements) == false
```

### Integration Tests

Test end-to-end settlement flow:

```pseudocode
test "settles with hub successfully":
    request = createSettlementRequest(
        settlementHub: SETTLEMENT_HUB_ADDRESS,
        hook: HOOK_ADDRESS,
        hookData: "0x..."
    )
    
    response = facilitator.settle(request)
    
    assert response.success == true
    assert response.transaction exists
```

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `MissingExtra` | No `extra` field | Check request format |
| `MissingSettlementHub` | No `settlementHub` in extra | Verify client configuration |
| `InvalidAddress` | Malformed address | Validate address format |
| `TransactionFailed` | On-chain execution failed | Check hook implementation |
| `InsufficientFunds` | Insufficient token balance | Verify payer balance |

### Error Handling Logic

```pseudocode
function handleSettlement(request):
    try:
        response = settleWithHub(request)
        return response
    catch MissingSettlementHub:
        return { success: false, error: "Invalid settlement configuration" }
    catch TransactionFailed:
        return { success: false, error: "Hook execution failed" }
    catch other:
        throw other  // Re-throw unexpected errors
```

## Configuration

### Environment Variables

```bash
# Standard Facilitator configuration
RPC_URL_BASE_SEPOLIA=https://sepolia.base.org
RPC_URL_BASE=https://mainnet.base.org
PRIVATE_KEY=0x...

# SettlementHub addresses (per network)
SETTLEMENT_HUB_BASE_SEPOLIA=0x...
SETTLEMENT_HUB_BASE=0x...
SETTLEMENT_HUB_ETHEREUM=0x...
```

### Network Configuration

```json
{
  "networks": {
    "base": {
      "rpcUrl": "https://mainnet.base.org",
      "settlementHub": "0x...",
      "chainId": 8453
    },
    "base-sepolia": {
      "rpcUrl": "https://sepolia.base.org", 
      "settlementHub": "0x...",
      "chainId": 84532
    }
  }
}
```

## Monitoring and Observability

### Key Metrics to Track
- Settlement success rate
- Average settlement time  
- Hook execution success rate
- Gas usage per settlement

### Event Monitoring
Listen for SettlementHub events:
- `Settled`: Payment completed successfully
- `HookExecuted`: Hook logic executed

## Performance Optimization

### Best Practices
1. **Connection Pooling**: Reuse blockchain connections and contract instances
2. **Batch Processing**: Process multiple settlements concurrently when possible
3. **Gas Optimization**: Estimate gas usage and add appropriate buffer (10-20%)

## Security Considerations

### Critical Security Checks
1. **Input Validation**: Validate all addresses, amounts, and parameters
2. **Signature Verification**: Verify ERC-3009 authorization signatures
3. **Rate Limiting**: Implement request rate limiting to prevent abuse
4. **Address Validation**: Ensure all contract addresses are valid
5. **Amount Validation**: Check for reasonable payment amounts

## Migration Guide

### From Standard to Settlement Mode

1. **Add Detection Logic**: Implement `isSettlementMode()` function
2. **Add Routing**: Modify main `settle()` method to route between modes
3. **Add SettlementHub Integration**: Implement `settleWithHub()` method
4. **Update Configuration**: Add SettlementHub addresses
5. **Update Tests**: Add settlement mode test cases

### Backward Compatibility

The settlement extension is fully backward compatible:
- Existing standard payments continue to work unchanged
- Only requests with `extra.settlementHub` use the new flow
- No breaking changes to existing APIs

## Summary

Extending a Facilitator for x402 settlement requires minimal changes:

1. **Detection**: Check for `extra.settlementHub` field
2. **Routing**: Route to appropriate settlement method
3. **Integration**: Call `SettlementHub.settleAndExecute` with hook parameters
4. **Same Parameters**: Use existing authorization data + hook info

**Key Benefits:**
- ✅ Minimal code changes required
- ✅ Backward compatible with existing flows  
- ✅ Enables powerful hook-based extensions
- ✅ Maintains security and reliability

**The extension adds maximum functionality with minimal complexity!**