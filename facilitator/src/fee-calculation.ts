/**
 * Fee Calculation Utilities
 *
 * Provides utilities for calculating and validating facilitator fees,
 * particularly for testnet percentage-based validation.
 */

import { getLogger } from "./telemetry.js";

const logger = getLogger();

/**
 * Fee configuration for testnet percentage-based validation
 */
export const FEE_CONFIG = {
  // Testnet minimum: 0.3% or $0.01 USD equivalent
  minPercentage: 0.003, // 0.3%
  minUsdCents: 1, // $0.01 USD
  // Stablecoin price assumption (USDC = $1.00)
  stablecoinPriceUSD: 1.0,
} as const;

/**
 * Fee validation result
 */
export interface FeeValidationResult {
  valid: boolean;
  requiredFee: bigint;
  providedFeePercent: string;
  requiredFeePercent: string;
}

/**
 * Get token symbol for a network
 *
 * @param network - Network identifier
 * @returns Token symbol (e.g., "USDC")
 */
export function getTokenSymbol(network: string): string {
  // For now, all supported networks use USDC
  // This can be expanded in the future to support other tokens
  return "USDC";
}

/**
 * Calculate fee for a given payment amount
 *
 * @param paymentAmount - Payment amount in token base units
 * @param tokenDecimals - Token decimals (e.g., 6 for USDC)
 * @param tokenSymbol - Token symbol
 * @returns Calculated fee in token base units
 */
export function calculateFee(
  paymentAmount: bigint,
  tokenDecimals: number,
  tokenSymbol: string = "USDC",
): bigint {
  // For stablecoins, use percentage-based fee with minimum
  const percentageFee = (paymentAmount * BigInt(Math.floor(FEE_CONFIG.minPercentage * 10000))) / 10000n;
  
  // Calculate minimum fee in token base units ($0.01 USD)
  const minFeeUSD = FEE_CONFIG.minUsdCents / 100; // Convert cents to dollars
  const minFeeTokens = minFeeUSD / FEE_CONFIG.stablecoinPriceUSD;
  const minFee = BigInt(Math.floor(minFeeTokens * 10 ** tokenDecimals));
  
  // Return the larger of percentage fee or minimum fee
  return percentageFee > minFee ? percentageFee : minFee;
}

/**
 * Validate that a fee meets minimum requirements
 *
 * @param feeAmount - Provided fee amount in token base units
 * @param paymentAmount - Payment amount in token base units
 * @param tokenDecimals - Token decimals (e.g., 6 for USDC)
 * @param tokenSymbol - Token symbol
 * @returns Validation result with details
 */
export function validateFee(
  feeAmount: bigint,
  paymentAmount: bigint,
  tokenDecimals: number,
  tokenSymbol: string = "USDC",
): FeeValidationResult {
  // Calculate required fee
  const requiredFee = calculateFee(paymentAmount, tokenDecimals, tokenSymbol);
  
  // Calculate percentages for display
  const providedPercent = Number((feeAmount * 10000n) / paymentAmount) / 100;
  const requiredPercent = Number((requiredFee * 10000n) / paymentAmount) / 100;
  
  // Validate fee meets minimum
  const valid = feeAmount >= requiredFee;
  
  logger.debug(
    {
      feeAmount: feeAmount.toString(),
      paymentAmount: paymentAmount.toString(),
      requiredFee: requiredFee.toString(),
      providedPercent: `${providedPercent.toFixed(2)}%`,
      requiredPercent: `${requiredPercent.toFixed(2)}%`,
      valid,
      tokenSymbol,
      tokenDecimals,
    },
    "Fee validation performed",
  );
  
  return {
    valid,
    requiredFee,
    providedFeePercent: `${providedPercent.toFixed(2)}%`,
    requiredFeePercent: `${requiredPercent.toFixed(2)}%`,
  };
}
