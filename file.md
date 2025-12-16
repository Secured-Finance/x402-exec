 Phase 1: Contract Deployment (Sepolia)

 1.1 Deploy SettlementRouter

 Contract: /Users/catalyst/work/x402-exec/contracts/src/SettlementRouter.sol
 - No constructor parameters needed
 - This is the core router contract
 - Critical: Must be deployed FIRST

 1.2 Deploy TransferHook

 Contract: /Users/catalyst/work/x402-exec/contracts/src/hooks/TransferHook.sol
 - Constructor parameter: _settlementRouter (address from step 1.1)
 - This hook handles simple transfers + fee distribution
 - Use this hook for standard merchant payments (replaces FeeReceiver logic)

 1.3 Record Deployment Addresses

 Save both addresses for configuration updates in Phase 2.

 ---
 Phase 2: Update sf/x402 Codebase

 2.1 Add SettlementRouter ABI

 File: /Users/catalyst/sf/x402/typescript/packages/x402/src/types/shared/evm/settlementRouterABI.ts (NEW)

 Source: Copy from /Users/catalyst/work/x402-exec/typescript/packages/core/src/abi.ts

 Required functions:
 - settleAndExecute(token, from, value, validAfter, validBefore, nonce, signature, salt, payTo, facilitatorFee, hook, 
 hookData)
 - calculateCommitment(token, from, value, validAfter, validBefore, salt, payTo, facilitatorFee, hook, hookData)
 - calculateContextKey(from, token, nonce)
 - isSettled(contextKey)
 - getPendingFees(facilitator, token)
 - claimFees(tokens[])

 2.2 Update Network Configuration

 File: /Users/catalyst/sf/x402/typescript/packages/x402/src/types/shared/evm/config.ts

 Changes:
 // Add to network config for Sepolia (chain ID: 11155111)
 settlementRouter: '0x<DEPLOYED_ROUTER_ADDRESS>',
 transferHook: '0x<DEPLOYED_HOOK_ADDRESS>',

 // Keep existing feeReceiver for backward compatibility
 feeReceiver: '0x8F35dfEC24944b5f87A97D38402dfA9117110d77',

 2.3 Create Commitment Calculation Utility

 File: /Users/catalyst/sf/x402/typescript/packages/x402/src/schemes/exact/evm/commitment.ts (NEW)

 Implementation:
 import { keccak256, encodePacked } from 'viem'

 export function calculateCommitment(params: {
   chainId: number
   router: `0x${string}`
   token: `0x${string}`
   from: `0x${string}`
   value: bigint
   validAfter: bigint
   validBefore: bigint
   salt: `0x${string}`
   payTo: `0x${string}`
   facilitatorFee: bigint
   hook: `0x${string}`
   hookData: `0x${string}`
 }): `0x${string}` {
   return keccak256(
     encodePacked(
       ['string', 'uint256', 'address', 'address', 'address', 'uint256', 'uint256', 'uint256', 'bytes32', 'address', 
 'uint256', 'address', 'bytes32'],
       [
         'X402/settle/v1',
         BigInt(params.chainId),
         params.router,
         params.token,
         params.from,
         params.value,
         params.validAfter,
         params.validBefore,
         params.salt,
         params.payTo,
         params.facilitatorFee,
         params.hook,
         keccak256(params.hookData)
       ]
     )
   )
 }

 export function generateSalt(): `0x${string}` {
   const bytes = crypto.getRandomValues(new Uint8Array(32))
   return `0x${Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')}`
 }

 Source reference: /Users/catalyst/work/x402-exec/typescript/packages/core/src/commitment.ts

 2.4 Update EIP-3009 Type Definitions

 File: /Users/catalyst/sf/x402/typescript/packages/x402/src/types/shared/evm/eip3009.ts

 Changes:
 Add new authorization type for SettlementRouter:

 export const EIP3009_TYPES = {
   // Existing types...
   TransferWithAuthorization: [...],
   ReceiveWithAuthorization: [...],

   // NEW: For SettlementRouter
   TransferWithAuthorizationRouter: [
     { name: 'from', type: 'address' },
     { name: 'to', type: 'address' },      // Must be SettlementRouter address
     { name: 'value', type: 'uint256' },
     { name: 'validAfter', type: 'uint256' },
     { name: 'validBefore', type: 'uint256' },
     { name: 'nonce', type: 'bytes32' }     // Must equal commitment hash
   ]
 }

 2.5 Update Client Payment Preparation

 File: /Users/catalyst/sf/x402/typescript/packages/x402/src/schemes/exact/evm/client.ts

 Changes to preparePaymentHeader() function:

 Current logic:
 1. Generate random nonce
 2. Set validAfter/validBefore
 3. Sign ERC-3009 authorization with nonce

 New logic for SettlementRouter mode:
 1. Generate salt (random 32 bytes)
 2. Calculate facilitatorFee (0.3%, min $0.01 in token decimals)
 3. Get router/hook addresses from config
 4. Calculate commitment hash (becomes the nonce)
 5. Sign ERC-3009 authorization with commitment as nonce
 6. Include settlement parameters in payment header

 New payment header structure:
 {
   // Standard ERC-3009 fields
   from: '0x...',
   to: '0x...router',        // SettlementRouter address
   value: totalAmount,
   validAfter: timestamp,
   validBefore: timestamp,
   nonce: commitment,        // Commitment hash, NOT random

   // Settlement-specific fields (new)
   settlementMode: true,
   salt: '0x...',
   payTo: merchantAddress,
   facilitatorFee: feeAmount,
   hook: transferHookAddress,
   hookData: '0x'           // Empty for simple transfers
 }

 2.6 Update Facilitator Settlement Logic

 File: /Users/catalyst/sf/x402/typescript/packages/x402/src/schemes/exact/evm/facilitator.ts

 Changes to settle() function (lines 340-358):

 Add settlement mode detection:
 const isSettlementMode = paymentHeader.settlementMode === true

 New settlement path (SettlementRouter):
 if (isSettlementMode) {
   // Verify commitment
   const expectedCommitment = calculateCommitment({
     chainId,
     router: config.settlementRouter,
     token: paymentHeader.to,
     from: paymentHeader.from,
     value: paymentHeader.value,
     validAfter: paymentHeader.validAfter,
     validBefore: paymentHeader.validBefore,
     salt: paymentHeader.salt,
     payTo: paymentHeader.payTo,
     facilitatorFee: paymentHeader.facilitatorFee,
     hook: paymentHeader.hook,
     hookData: paymentHeader.hookData || '0x'
   })

   if (expectedCommitment !== paymentHeader.nonce) {
     throw new Error('Commitment mismatch')
   }

   // Check if already settled (idempotency)
   const contextKey = await publicClient.readContract({
     address: config.settlementRouter,
     abi: SETTLEMENT_ROUTER_ABI,
     functionName: 'calculateContextKey',
     args: [paymentHeader.from, token, paymentHeader.nonce]
   })

   const isSettled = await publicClient.readContract({
     address: config.settlementRouter,
     abi: SETTLEMENT_ROUTER_ABI,
     functionName: 'isSettled',
     args: [contextKey]
   })

   if (isSettled) {
     throw new Error('Already settled')
   }

   // Call settleAndExecute
   const { v, r, s } = splitSignature(paymentHeader.signature)
   const signature = encodeAbiParameters(
     [{ type: 'bytes' }],
     [concat([r, s, toHex(v)])]
   )

   const hash = await walletClient.writeContract({
     address: config.settlementRouter,
     abi: SETTLEMENT_ROUTER_ABI,
     functionName: 'settleAndExecute',
     args: [
       token,
       paymentHeader.from,
       paymentHeader.value,
       paymentHeader.validAfter,
       paymentHeader.validBefore,
       paymentHeader.nonce,        // Commitment hash
       signature,
       paymentHeader.salt,
       paymentHeader.payTo,
       paymentHeader.facilitatorFee,
       paymentHeader.hook,
       paymentHeader.hookData || '0x'
     ]
   })

   return hash
 }

 Keep existing FeeReceiver path for backward compatibility:
 else if (config.feeReceiver && useFeeReceiver) {
   // Existing FeeReceiver logic (unchanged)
   const { v, r, s } = splitSignature(paymentHeader.signature)
   const hash = await walletClient.writeContract({
     address: config.feeReceiver,
     abi: FEE_RECEIVER_ABI,
     functionName: 'settleWithAuthorization',
     args: [token, payer, merchant, totalAmount, validAfter, validBefore, nonce, v, r, s]
   })
   return hash
 }

 2.7 Update Fee Claiming Logic

 File: /Users/catalyst/sf/x402/typescript/packages/x402/src/schemes/exact/evm/facilitator.ts

 Add new fee claim function:
 export async function claimSettlementFees(params: {
   facilitatorAddress: `0x${string}`
   tokens: `0x${string}`[]
   chainId: number
   walletClient: WalletClient
 }) {
   const config = getNetworkConfig(params.chainId)

   if (!config.settlementRouter) {
     throw new Error('SettlementRouter not configured for this network')
   }

   // Get pending fees
   const pendingFees = await Promise.all(
     params.tokens.map(token =>
       publicClient.readContract({
         address: config.settlementRouter,
         abi: SETTLEMENT_ROUTER_ABI,
         functionName: 'getPendingFees',
         args: [params.facilitatorAddress, token]
       })
     )
   )

   // Filter tokens with non-zero fees
   const claimableTokens = params.tokens.filter((_, i) => pendingFees[i] > 0n)

   if (claimableTokens.length === 0) {
     return null
   }

   // Claim fees
   const hash = await params.walletClient.writeContract({
     address: config.settlementRouter,
     abi: SETTLEMENT_ROUTER_ABI,
     functionName: 'claimFees',
     args: [claimableTokens]
   })

   return hash
 }

 2.8 Update Constants

 File: /Users/catalyst/sf/x402/typescript/packages/x402/src/constants.ts

 Add:
 // Settlement protocol version
 export const SETTLEMENT_PROTOCOL_VERSION = 'X402/settle/v1'

 // Empty hook data constant
 export const EMPTY_HOOK_DATA = '0x' as const

 ---
 Phase 3: Testing Strategy

 3.1 Unit Tests

 Test files to create:
 - /Users/catalyst/sf/x402/typescript/packages/x402/src/schemes/exact/evm/__tests__/commitment.test.ts
 - /Users/catalyst/sf/x402/typescript/packages/x402/src/schemes/exact/evm/__tests__/settlement-router.test.ts

 Test cases:
 1. Commitment calculation matches contract
 2. Salt generation produces unique values
 3. Signature verification with commitment as nonce
 4. Fee calculation matches TransferHook expectations
 5. Idempotency checks work correctly

 3.2 Integration Tests (Sepolia)

 Test scenarios:
 1. Simple payment: Client → Facilitator → SettlementRouter → TransferHook → Merchant
 2. Fee accumulation: Verify facilitatorFee is accumulated in router
 3. Fee claiming: Facilitator claims accumulated fees
 4. Idempotency: Attempt to settle same payment twice (should fail)
 5. Commitment tampering: Modify payTo after signing (should fail)
 6. Backward compatibility: Existing FeeReceiver payments still work

 3.3 Gas Cost Comparison

 Metrics to track:
 - FeeReceiver: settleWithAuthorization gas cost
 - SettlementRouter: settleAndExecute gas cost
 - Expected overhead: 8k gas (16%) for hook architecture

 ---
 Phase 4: Migration Rollout

 4.1 Sepolia Deployment (Week 1)

 1. Deploy contracts to Sepolia
 2. Update sf/x402 codebase with Sepolia config
 3. Run full integration test suite
 4. Deploy test merchant API on Sepolia
 5. Test end-to-end payment flow

 4.2 Gradual Feature Rollout

 Option A: Feature flag approach
 - Add useSettlementRouter flag to payment requirements
 - Merchants opt-in to new architecture
 - Both systems coexist during transition

 Option B: Network-based rollout
 - New networks (future deployments) use SettlementRouter only
 - Existing networks (Sepolia FeeReceiver, Filecoin FeeReceiver) remain on FeeReceiver
 - Migrate network-by-network as contracts are deployed

 4.3 Production Networks (Post-Audit)

 Deployment order:
 1. Ethereum Mainnet (highest value, audit critical)
 2. Base Mainnet (L2, lower fees)
 3. Filecoin Mainnet (current production network)
 4. Other networks (Polygon, Avalanche, etc.)

 ---
 Phase 5: Documentation Updates

 5.1 Developer Documentation

 Files to update:
 - /Users/catalyst/sf/x402/README.md - Add SettlementRouter section
 - Create migration guide for existing integrations
 - Update API examples with settlement mode

 5.2 Integration Guide

 Topics to cover:
 - When to use SettlementRouter vs FeeReceiver
 - How commitment calculation works
 - Signature requirements (commitment as nonce)
 - Hook selection (TransferHook for simple payments)
 - Fee claiming process

 ---
 Critical Files for Modification

 New Files (7):

 1. /Users/catalyst/sf/x402/typescript/packages/x402/src/types/shared/evm/settlementRouterABI.ts
 2. /Users/catalyst/sf/x402/typescript/packages/x402/src/schemes/exact/evm/commitment.ts
 3. /Users/catalyst/sf/x402/typescript/packages/x402/src/schemes/exact/evm/__tests__/commitment.test.ts
 4. /Users/catalyst/sf/x402/typescript/packages/x402/src/schemes/exact/evm/__tests__/settlement-router.test.ts

 Modified Files (5):

 1. /Users/catalyst/sf/x402/typescript/packages/x402/src/types/shared/evm/config.ts - Add router/hook addresses
 2. /Users/catalyst/sf/x402/typescript/packages/x402/src/types/shared/evm/eip3009.ts - Add router auth type
 3. /Users/catalyst/sf/x402/typescript/packages/x402/src/schemes/exact/evm/client.ts - Update payment preparation
 4. /Users/catalyst/sf/x402/typescript/packages/x402/src/schemes/exact/evm/facilitator.ts - Add settlement path
 5. /Users/catalyst/sf/x402/typescript/packages/x402/src/constants.ts - Add protocol constants

 ---
 Key Architectural Differences

 FeeReceiver (Current)

 | Aspect        | Implementation                                                      |
 |---------------|---------------------------------------------------------------------|
 | Signature     | Standard ERC-3009 (from, to, value, validAfter, validBefore, nonce) |
 | Nonce         | Random 32 bytes                                                     |
 | Fee           | Calculated in contract (0.3%, min $0.01)                            |
 | Recipient     | Hardcoded merchant parameter                                        |
 | Extensibility | None (single purpose)                                               |

 SettlementRouter (New)

 | Aspect        | Implementation
                  |
 |---------------|----------------------------------------------------------------------------------------------------
 -----------------|
 | Signature     | Standard ERC-3009 BUT nonce = commitment hash
                  |
 | Nonce         | commitment = hash(router, token, from, value, validAfter, validBefore, salt, payTo, facilitatorFee,
  hook, hookData) |
 | Fee           | Explicitly passed, accumulated in router, claimed separately
                  |
 | Recipient     | Flexible payTo parameter
                  |
 | Extensibility | Hook system (TransferHook, custom hooks)
                  |

 Critical Change: Commitment-Based Nonce

 Why this matters:
 - Old: User signs authorization with random nonce → facilitator can change any parameter
 - New: User signs authorization with commitment hash as nonce → parameters are cryptographically locked
 - Security: Prevents facilitator from tampering with payTo, fee, or hook after signature

 Implementation impact:
 1. Client MUST calculate commitment before signing
 2. Client MUST include all settlement parameters in payment header
 3. Facilitator MUST verify commitment matches nonce
 4. Any parameter mismatch causes transaction revert

 ---
 Risk Mitigation

 Backward Compatibility

 - Keep FeeReceiver code path active
 - Detect settlement mode from payment header
 - Default to FeeReceiver for networks without SettlementRouter

 Signature Verification

 - Add commitment verification before submission
 - Fail fast if commitment mismatch detected
 - Log all commitment validation failures for debugging

 Gas Cost Monitoring

 - Track gas costs for both paths
 - Alert if SettlementRouter path exceeds budget
 - Consider gas price optimization strategies

 Rollback Plan

 - Keep FeeReceiver deployments active
 - Feature flag allows instant rollback to FeeReceiver
 - Monitor error rates and revert if issues detected

 ---
 Success Criteria

 Phase 1 (Deployment)

 - ✅ SettlementRouter deployed to Sepolia
 - ✅ TransferHook deployed to Sepolia
 - ✅ Both contracts verified on Etherscan

 Phase 2 (Implementation)

 - ✅ All code changes implemented
 - ✅ Unit tests pass with 100% coverage
 - ✅ TypeScript compilation successful
 - ✅ No breaking changes to existing FeeReceiver flow

 Phase 3 (Testing)

 - ✅ Integration tests pass on Sepolia
 - ✅ End-to-end payment flow works
 - ✅ Fee claiming works correctly
 - ✅ Idempotency protection verified
 - ✅ Commitment tampering protection verified

 Phase 4 (Production)

 - ✅ Zero payment failures
 - ✅ Gas costs within expected range (~8k overhead)
 - ✅ Fee claiming successful
 - ✅ Merchant receives correct net amount

 ---
 Questions for User Confirmation

 Before proceeding with implementation:

 1. Audit status: Are the SettlementRouter contracts at /Users/catalyst/work/x402-exec/contracts/src already audited,
 or do they need audit before mainnet deployment?
 2. Fee parity: Should the fee structure remain 0.3% with $0.01 minimum, or does the new architecture allow different
 fees?
 3. Backward compatibility requirement: Should we maintain FeeReceiver support indefinitely, or plan deprecation after
  migration?
 4. Network priority: After Sepolia, which network is most critical for production deployment? (Ethereum mainnet,
 Filecoin mainnet, or Base mainnet?)
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌


  
  Verification:
    TransferHook: 0x8957589Dd1240f2177442447013927db52851104
    SettlementRouter: 0x8750dEC68d7D5838e059A35eA42E38f1e25A1508