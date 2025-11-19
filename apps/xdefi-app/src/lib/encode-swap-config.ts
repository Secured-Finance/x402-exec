#!/usr/bin/env node
/**
 * @file encodeSwapConfig.ts
 * @notice Script to encode SwapConfig struct for OKXDexHook.execute() method
 *
 * This script helps construct the `data` parameter for the OKXDexHook.execute() method
 * by encoding a SwapConfig struct with the following fields:
 * - address dexAggregator
 * - address approveAddress
 * - bytes swapCalldata
 * - address toToken
 * - uint256 minAmountOut
 * - bool isNativeToken
 *
 * Usage:
 *   tsx script/encodeSwapConfig.ts \
 *     --dexAggregator 0xc259de94F6bedDec5Ed1C024b0283082ffa50cca \
 *     --swapCalldata 0x... \
 *     --toToken 0x0000000000000000000000000000000000000000 \
 *     --minAmountOut 100000000000000 \
 *     --isNativeToken true
 *
 * Or use as a module:
 *   import { encodeSwapConfig } from './script/encodeSwapConfig';
 *   const data = encodeSwapConfig({ ... });
 */

import { type Address, encodeAbiParameters, type Hex } from "viem";

/**
 * SwapConfig parameters
 */
export interface SwapConfigParams {
	/** Address of the DEX aggregator contract (must be whitelisted OKX aggregator) */
	dexAggregator: Address;
	/** Address to approve tokens to (usually the DEX aggregator or router) */
	approveAddress: Address;
	/** Pre-encoded swap transaction calldata from OKX DEX API (must have function selector) */
	swapCalldata: Hex | string;
	/** Address of the token to receive after swap (must be address(0) if isNativeToken is true) */
	toToken: Address;
	/** Minimum amount of toToken to receive (slippage protection) */
	minAmountOut: bigint | string | number;
	/** Whether the output token is native token (ETH). If true, toToken must be address(0) */
	isNativeToken: boolean;
}

/**
 * Encode SwapConfig struct for OKXDexHook.execute() method
 *
 * @param config SwapConfig parameters
 * @returns Encoded bytes data for execute() method
 */
export function encodeSwapConfig(config: SwapConfigParams): Hex {
	// Validate inputs
	if (
		!config.dexAggregator ||
		config.dexAggregator === "0x0000000000000000000000000000000000000000"
	) {
		throw new Error("dexAggregator address cannot be zero");
	}

	if (
		!config.approveAddress ||
		config.approveAddress === "0x0000000000000000000000000000000000000000"
	) {
		throw new Error("approveAddress cannot be zero");
	}

	if (!config.swapCalldata || config.swapCalldata.length < 10) {
		throw new Error(
			"swapCalldata must be at least 4 bytes (function selector)",
		);
	}

	// Validate native token configuration consistency
	if (
		config.isNativeToken &&
		config.toToken !== "0x0000000000000000000000000000000000000000"
	) {
		throw new Error("If isNativeToken is true, toToken must be address(0)");
	}
	if (
		!config.isNativeToken &&
		config.toToken === "0x0000000000000000000000000000000000000000"
	) {
		throw new Error(
			"If isNativeToken is false, toToken must not be address(0)",
		);
	}

	// Convert minAmountOut to bigint
	const minAmountOut =
		typeof config.minAmountOut === "bigint"
			? config.minAmountOut
			: BigInt(config.minAmountOut);

	// Ensure swapCalldata is a valid hex string
	const swapCalldata =
		typeof config.swapCalldata === "string"
			? config.swapCalldata.startsWith("0x")
				? (config.swapCalldata as Hex)
				: (`0x${config.swapCalldata}` as Hex)
			: config.swapCalldata;

	// Encode the SwapConfig struct as a tuple
	// struct SwapConfig {
	//   address dexAggregator;
	//   address approveAddress;
	//   bytes swapCalldata;
	//   address toToken;
	//   uint256 minAmountOut;
	//   bool isNativeToken;
	// }
	const encoded = encodeAbiParameters(
		[
			{
				type: "tuple",
				components: [
					{ name: "dexAggregator", type: "address" },
					{ name: "approveAddress", type: "address" },
					{ name: "swapCalldata", type: "bytes" },
					{ name: "toToken", type: "address" },
					{ name: "minAmountOut", type: "uint256" },
					{ name: "isNativeToken", type: "bool" },
				],
			},
		],
		[
			{
				dexAggregator: config.dexAggregator,
				approveAddress: config.approveAddress,
				swapCalldata: swapCalldata,
				toToken: config.toToken,
				minAmountOut: minAmountOut,
				isNativeToken: config.isNativeToken,
			},
		],
	);

	return encoded;
}
