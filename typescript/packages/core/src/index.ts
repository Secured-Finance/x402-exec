/**
 * @secured-finance/x402-core
 *
 * Core utilities for x402x settlement framework
 *
 * @example
 * ```typescript
 * import {
 *   calculateCommitment,
 *   generateSalt,
 *   getNetworkConfig,
 *   TransferHook,
 *   addSettlementExtra
 * } from '@secured-finance/x402-core';
 *
 * // Generate payment requirements with settlement extension
 * const config = getNetworkConfig('base-sepolia');
 * const requirements = addSettlementExtra(baseRequirements, {
 *   hook: TransferHook.getAddress('base-sepolia'),
 *   hookData: TransferHook.encode(),
 *   facilitatorFee: '10000',
 *   payTo: merchantAddress,
 * });
 * ```
 */

// Export types
export type {
  AssetConfig,
  CommitmentParams,
  NetworkConfig,
  SettlementExtra,
  SettlementExtraCore,
  PaymentRequirements,
  PaymentPayload,
  Signer,
  DemoHooks,
} from "./types.js";

export { SettlementExtraError } from "./types.js";

// Export commitment utilities
export { calculateCommitment, generateSalt, validateCommitmentParams } from "./commitment.js";

// Export network utilities
export {
  networks,
  getNetworkConfig,
  isNetworkSupported,
  getSupportedNetworks,
  getSupportedAssets,
  getAssetBySymbol,
  validateAsset,
} from "./networks.js";

// Export builtin hooks
export { TransferHook, NFTMintHook, RewardHook } from "./hooks/index.js";

// Export demo hooks configuration types
export type { MintConfig, RewardConfig } from "./hooks/demo.js";

// Export helper functions
export { addSettlementExtra } from "./utils.js";

// Export amount utilities
export { parseDefaultAssetAmount, formatDefaultAssetAmount, AmountError } from "./amount.js";

// Export facilitator API client utilities
export {
  calculateFacilitatorFee,
  clearFeeCache,
  isSettlementMode,
  parseSettlementExtra,
  verify,
  settle,
} from "./facilitator.js";

export type { FeeCalculationResult, VerifyResponse, SettleResponse } from "./facilitator.js";

// Export ABI
export { SETTLEMENT_ROUTER_ABI } from "./abi.js";
