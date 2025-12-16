/**
 * Commitment calculation utility for X402 Settlement
 * Simplified using @sf-x402/core
 */

// Re-export from @sf-x402/core for backward compatibility
export {
  type CommitmentParams,
  calculateCommitment,
  generateSalt,
  validateCommitmentParams,
} from "@sf-x402/core";
