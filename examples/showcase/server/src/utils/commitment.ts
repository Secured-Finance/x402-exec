/**
 * Commitment calculation utility for X402 Settlement
 * Simplified using @secured-finance/core
 */

// Re-export from @secured-finance/core for backward compatibility
export {
  type CommitmentParams,
  calculateCommitment,
  generateSalt,
  validateCommitmentParams,
} from "@secured-finance/core";
