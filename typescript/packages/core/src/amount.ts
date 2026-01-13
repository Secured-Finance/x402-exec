/**
 * Amount parsing and formatting utilities for x402x default asset (USDC)
 */

import type { Network } from "x402/types";
import { processPriceToAtomicAmount, getDefaultAsset } from "x402/shared";
import { getNetworkConfig, getAssetBySymbol } from "./networks.js";

/**
 * Error class for amount-related validation errors
 */
export class AmountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AmountError";
  }
}

/**
 * Parse amount from various formats to atomic units for the default asset or specified token
 *
 * Supports multiple input formats:
 * - Dollar format: '$1.2' or '$1.20' → '1200000' (1.2 USDC) or '1200000000000000000' (1.2 JPYC with 18 decimals)
 * - Decimal string: '1.2' or '1.20' → '1200000' or '1200000000000000000'
 * - Number: 1.2 → '1200000' or '1200000000000000000'
 *
 * Uses x402's processPriceToAtomicAmount for parsing. All string/number inputs
 * are treated as USD amounts, not atomic units.
 *
 * @param amount - Amount in various formats (USD, not atomic units)
 * @param network - Network name (required) - used to determine token decimals
 * @param token - Optional token symbol (e.g., 'USDC', 'JPYC') - if not provided, uses default asset
 * @returns Amount in atomic units as string
 * @throws AmountError if amount format is invalid or token is not supported
 *
 * @example
 * ```typescript
 * parseDefaultAssetAmount('$1.2', 'base-sepolia')           // '1200000' (USDC, 6 decimals)
 * parseDefaultAssetAmount('$1.2', 'sepolia', 'USDC')        // '1200000' (USDC, 6 decimals)
 * parseDefaultAssetAmount('$1.2', 'sepolia', 'JPYC')        // '1200000000000000000' (JPYC, 18 decimals)
 * parseDefaultAssetAmount('1.2', 'base-sepolia')            // '1200000'
 * ```
 */
export function parseDefaultAssetAmount(
  amount: string | number,
  network: Network,
  token?: string,
): string {
  // Handle empty/invalid input
  if (amount === null || amount === undefined || amount === "") {
    throw new AmountError("Amount is required");
  }

  // If token is specified, use token-specific decimals
  if (token) {
    const networkConfig = getNetworkConfig(network);
    const assetConfig = getAssetBySymbol(network, token);
    if (!assetConfig) {
      throw new AmountError(
        `Token '${token}' is not supported on network '${network}'. ` +
          `Supported tokens: ${networkConfig.supportedAssets.map((a) => a.symbol).join(", ")}`,
      );
    }

    // Convert amount to number for calculation
    const amountNum = typeof amount === "string" ? parseFloat(amount.replace(/^\$/, "")) : amount;
    if (isNaN(amountNum)) {
      throw new AmountError(`Invalid amount format: ${amount}`);
    }

    // Calculate atomic units: amount * 10^decimals
    const atomicAmount = BigInt(Math.round(amountNum * Math.pow(10, assetConfig.decimals)));
    return atomicAmount.toString();
  }

  // Use x402's processPriceToAtomicAmount for parsing (uses default asset)
  // This handles all string/number inputs as USD amounts
  const result = processPriceToAtomicAmount(amount, network);

  if ("error" in result) {
    throw new AmountError(`Invalid amount format: ${result.error}`);
  }

  return result.maxAmountRequired;
}

/**
 * Format atomic units to human-readable decimal string for the default asset or specified token
 *
 * Automatically determines decimals from the network's default asset configuration or specified token.
 *
 * @param amount - Amount in atomic units
 * @param network - Network name (required) - used to determine token decimals
 * @param token - Optional token symbol (e.g., 'USDC', 'JPYC') - if not provided, uses default asset
 * @returns Human-readable decimal string
 * @throws AmountError if amount is invalid or token is not supported
 *
 * @example
 * ```typescript
 * formatDefaultAssetAmount('1200000', 'base-sepolia')              // '1.2' (USDC, 6 decimals)
 * formatDefaultAssetAmount('1200000', 'sepolia', 'USDC')            // '1.2' (USDC, 6 decimals)
 * formatDefaultAssetAmount('1200000000000000000', 'sepolia', 'JPYC') // '1.2' (JPYC, 18 decimals)
 * formatDefaultAssetAmount('1000000', 'base-sepolia')              // '1'
 * ```
 */
export function formatDefaultAssetAmount(
  amount: string,
  network: Network,
  token?: string,
): string {
  const atomicAmount = BigInt(amount);
  if (atomicAmount < 0n) {
    throw new AmountError("Amount cannot be negative");
  }

  // Get decimals from token or default asset
  let decimals: number;
  if (token) {
    const networkConfig = getNetworkConfig(network);
    const assetConfig = getAssetBySymbol(network, token);
    if (!assetConfig) {
      throw new AmountError(
        `Token '${token}' is not supported on network '${network}'. ` +
          `Supported tokens: ${networkConfig.supportedAssets.map((a) => a.symbol).join(", ")}`,
      );
    }
    decimals = assetConfig.decimals;
  } else {
    // Get decimals from network's default asset
    const asset = getDefaultAsset(network);
    decimals = asset.decimals;
  }

  const amountStr = atomicAmount.toString().padStart(decimals + 1, "0");
  const integerPart = amountStr.slice(0, -decimals) || "0";
  const decimalPart = amountStr.slice(-decimals);

  // Remove trailing zeros from decimal part
  const trimmedDecimal = decimalPart.replace(/0+$/, "");

  if (trimmedDecimal) {
    return `${integerPart}.${trimmedDecimal}`;
  }
  return integerPart;
}
