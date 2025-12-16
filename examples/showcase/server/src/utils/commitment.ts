/**
 * Commitment calculation utility for X402 Settlement
 * Simplified using @secured-finance/x402-core
 */

// Re-export from @secured-finance/x402-core for backward compatibility
export {
  type CommitmentParams,
  calculateCommitment,
  generateSalt,
  validateCommitmentParams,
} from "@secured-finance/x402-core";
