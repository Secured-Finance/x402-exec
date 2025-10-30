# Security Analysis

This document explains the security model, known risks, and security considerations for developers of the X402 Settlement protocol.

## Core Security Model

### Trust Assumptions

The X402 Settlement protocol involves three main roles:

```
Client (User)          →  Trusts Resource Server for payment parameters
     ↓                    ↓
EIP-3009 Signature        Payment parameters (hook, hookData)
     ↓                    ↓
Facilitator            →  Calls SettlementHub
     ↓
SettlementHub          →  Verifies signature and executes
     ↓
Hook Contract          →  Executes business logic
```

### Current Signature Coverage

**Client's EIP-3009 Signature Covers**:
- ✅ `from` (Payer)
- ✅ `to` (SettlementHub address)
- ✅ `value` (Amount)
- ✅ `validAfter`, `validBefore` (Validity period)
- ✅ `nonce` (Anti-replay)

**Client's EIP-3009 Signature Does NOT Cover**:
- ❌ `hook` (Hook contract address)
- ❌ `hookData` (Hook parameters)

**Note**: `contextKey` is not a passed parameter but is calculated by the contract from `(from, token, nonce)`, so it cannot be tampered with by the Facilitator.

## Known Risks

### 🚨 Risk 1: Facilitator Can Tamper with Payment Parameters

**Threat Scenario**:

```
1. Resource Server generates payment requirements:
   {
     hook: "0xRevenueSplitHook",
     hookData: "merchant 85%, platform 15%"
   }

2. Client signs EIP-3009 authorization
   - Signature only protects: to=SettlementHub, value=100 USDC, nonce
   - Does not protect: hook, hookData

3. Malicious Facilitator can:
   
   Attack A: Replace Hook address
     hook: "0xMaliciousHook"  ← Malicious contract
     hookData: arbitrary value
   
   Attack B: Tamper with Hook parameters
     hook: "0xRevenueSplitHook"  ← Keep unchanged
     hookData: "attacker 100%"   ← Modify split ratio

4. SettlementHub executes:
   ✅ EIP-3009 signature verification passes
   ❌ But hook/hookData have been tampered with
   
5. Result:
   - Funds transferred to wrong recipients
   - Business logic executed incorrectly
```

**Victim Analysis**:

| Role | Loss | Reason |
|------|------|--------|
| Resource Server | ❌ Expected payment stolen | hook/hookData tampered |
| Client | ⚠️ May not receive service after payment | Server didn't receive payment |
| Honest Facilitator | ⚠️ Reputation damaged | Attacked by malicious competitors |

### Risk Assessment

| Attack Method | Current Defense | Status |
|---------------|----------------|--------|
| Replace hook address | No technical protection | ❌ Risk exists |
| Tamper with hookData | No technical protection | ❌ Risk exists |
| Replay old transactions | EIP-3009 nonce + contextKey idempotency | ✅ Protected |
| Steal Client funds | EIP-3009 signature protects `to` address | ✅ Protected |

## Current Mitigation Strategies

### Strategy 1: Resource Server Runs Its Own Facilitator (Recommended)

**Simplest and most reliable solution**: Resource Server does not rely on third-party Facilitators and calls settle itself.

```typescript
// Resource Server generates payment requirements
const paymentRequirements = {
  extra: {
    settlementHub: "0x...",
    hook: "0xRevenueSplitHook",
    hookData: "0x..."
  }
};

// After Client authorization callback, Resource Server calls itself
await settlementHub.settleAndExecute(
  token, from, value, validAfter, validBefore, nonce, signature,
  hook, hookData
);
```

**Advantages**:
- ✅ Full control of settle process
- ✅ No need to trust third parties
- ✅ Simple and reliable

**Disadvantages**:
- ⚠️ Resource Server needs to maintain infrastructure
- ⚠️ Cannot leverage third-party Facilitator services
- ⚠️ Limited scalability

## Future Improvement Directions

### Direction 1: Resource Server Signature Mechanism

Add Resource Server signature verification in the `SettlementHub` contract:

```solidity
function settleAndExecute(
    ...
    address hook,
    bytes calldata hookData,
    bytes calldata resourceServerSignature  // New
) external {
    // 1. Verify EIP-3009 signature (existing)
    
    // 2. Calculate contextKey (existing)
    bytes32 contextKey = calculateContextKey(from, token, nonce);
    
    // 3. Verify Resource Server signature (new)
    //    - Signature covers: hook + hookData + contextKey
    //    - Prevents Facilitator from tampering with any parameters
    
    // 4. Execute...
}
```

**Core Concept**:
- Resource Server signs complete business parameters
- Hub contract verifies signature to ensure parameters are untampered
- Need to solve: How to manage trusted Resource Server public keys

**Challenges**:
- How to decentrally manage trusted Resource Server list
- Increased gas cost (ECDSA verification ~3k gas)
- Implementation and deployment complexity

### Direction 2: Extended Client Signature Mechanism

Allow Resource Server to add custom fields in Client signature:

```typescript
// Client signature includes more information
const authorization = {
  from: clientAddress,
  to: settlementHub,
  value: amount,
  // ... EIP-3009 standard fields
  
  // Extended fields (requires new signature standard)
  hook: hookAddress,
  hookData: hookData
  // Note: contextKey is still calculated by contract, no signature needed
};
```

**Advantages**:
- Single signature covers all parameters
- Most thorough protection

**Challenges**:
- Need to modify or extend EIP-3009 standard
- Client wallet compatibility issues
- Standardization and promotion difficulty

## Development Security Guide

### For Resource Server Developers

1. **[Recommended] Run Your Own Facilitator**
   - Full control of settle process
   - Avoid relying on third parties

2. **Monitor On-chain Events**
   - Verify all settlement parameters
   - Detect anomalies promptly

3. **Use contextKey Idempotency**
   - Ensure each business operation can only execute once
   - Prevent duplicate charges

4. **Choose Trusted Facilitators**
   - If using third parties, choose reputable service providers
   - Establish monitoring and alerting mechanisms

### For Hook Developers

1. **Verify Caller**
   - Use `onlyHub` modifier
   - Ensure only callable by SettlementHub

2. **Parameter Validation**
   - Validate all input parameters
   - Prevent overflow and boundary conditions

3. **Access Control**
   - Sensitive operations require permission checks
   - Properly use namespace isolation

4. **Event Logging**
   - Record all critical operations
   - Facilitate auditing and monitoring

## Risk Acceptance Statement

**Current Decision**: Temporarily accept the risk of Facilitator parameter tampering

**Rationale**:
- Recommend Resource Server runs its own to avoid risk
- Implementing complete signature mechanism has high complexity
- Make way for rapid iteration and market validation
- Current contextKey idempotency provides basic protection

**Monitoring Metrics**:
- Facilitator tampering behavior reports
- User fund loss incidents
- Community feedback on security

**Trigger Conditions**:
When risks exceed acceptable thresholds, signature verification mechanism will be prioritized.

## Reporting Security Issues

If you discover a security vulnerability, please disclose responsibly through:

1. GitHub security issue


## Summary

The X402 Settlement protocol's current security model is based on the following assumptions:

✅ **Existing Protections**:
- Client fund security (EIP-3009 signature protection)
- Replay attack protection (nonce + contextKey)
- Hub and Hook access control

⚠️ **Known Limitations**:
- Facilitator can tamper with business parameters
- Requires Resource Server to run its own or choose trusted Facilitator

🔮 **Future Improvements**:
- Resource Server signature mechanism
- Client signature extension

Please evaluate risks based on your use case and choose an appropriate deployment strategy.
