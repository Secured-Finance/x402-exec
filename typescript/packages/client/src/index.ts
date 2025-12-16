/**
 * @secured-finance/client - Client SDK for x402x Serverless Mode
 *
 * This package provides a simple, type-safe SDK for executing on-chain contracts
 * directly via facilitator without needing a resource server.
 *
 * @example High-level API
 * ```typescript
 * import { X402Client } from '@secured-finance/client';
 * import { TransferHook } from '@secured-finance/core';
 *
 * const client = new X402Client({
 *   wallet: walletClient,
 *   network: 'base-sepolia',
 *   facilitatorUrl: 'https://facilitator.x402x.dev'
 * });
 *
 * // Simple transfer (hook and hookData are optional, defaults to TransferHook)
 * const result = await client.execute({
 *   amount: '1000000',
 *   payTo: '0x...'
 * });
 * ```
 *
 * @example Low-level API
 * ```typescript
 * import {
 *   prepareSettlement,
 *   signAuthorization,
 *   settle
 * } from '@secured-finance/client';
 *
 * const settlement = await prepareSettlement({...});
 * const signed = await signAuthorization(wallet, settlement);
 * const result = await settle(facilitatorUrl, signed);
 * ```
 *
 * @example React Hooks
 * ```typescript
 * import { useX402Client, useExecute } from '@secured-finance/client';
 *
 * const client = useX402Client({
 *   facilitatorUrl: 'https://facilitator.x402x.dev'
 * });
 *
 * const { execute, status, error } = useExecute();
 * await execute({ hook: '0x...', amount: '1000000', ... });
 * ```
 *
 * @module @secured-finance/client
 */

// Export main client class and constants
export { X402Client, DEFAULT_FACILITATOR_URL } from "./client.js";

// Export low-level API (aligned with x402 standard terminology)
export { prepareSettlement } from "./core/prepare.js";
export { signAuthorization } from "./core/sign.js";
export { settle } from "./core/settle.js";

// Export utilities
export {
  generateSalt,
  calculateTimeWindow,
  formatFacilitatorUrl,
  normalizeAddress,
} from "./core/utils.js";

// Re-export new amount utilities from @secured-finance/core (recommended)
export { parseDefaultAssetAmount, formatDefaultAssetAmount, AmountError } from "@secured-finance/core";

// Export React hooks (optional, requires React peer dependency)
export { useX402Client } from "./hooks/useX402Client.js";
export { useExecute } from "./hooks/useExecute.js";

// Re-export core types for convenience
export type { FeeCalculationResult } from "@secured-finance/core";

// Export types
export type {
  X402ClientConfig,
  ExecuteParams,
  ExecuteResult,
  SettlementData,
  PrepareParams,
  SignedAuthorization,
  SettleResult,
  ExecuteStatus,
  PaymentPayload,
  PaymentRequirements,
} from "./types.js";

// Export errors
export {
  X402ClientError,
  NetworkError,
  SigningError,
  FacilitatorError,
  TransactionError,
  ValidationError,
} from "./errors.js";
