// Central configuration for the $X402X token mint.
// Update this file to change contract addresses, ABIs and sale parameters.

export type ContractAbi = readonly unknown[];

import { baseSepolia } from "@reown/appkit/networks";

// Network used for the token mint – today we only support Base testnet.
export const TOKEN_MINT_NETWORK = "base-sepolia" as const;

export const X402X_TOKEN_CONFIG = {
	// Display / metadata
	symbol: "X402X",
	name: "X402X Token",
	decimals: 18,

	// Supply & allocation (in full tokens, not atomic units)
	totalSupplyTokens: 1_000_000_000,
	// Portion of the total supply allocated to this initial mint event
	mintAllocationTokens: 100_000_000, // 10% of total supply

	// ERC20 token contract for $X402X
	address: "0x904E982D70079eeDAA4AeaA51861ae3F59e02bbe" as `0x${string}`,
} as const;

export const X402X_MINT_CONFIG = {
	// Mint / hook contract that receives USDC and mints $X402X (used as x402x hook).
	address: "0x4f6F911AE72d717b4ED96FEFabB6ddbf3ae8B921" as `0x${string}`,

	// Bonding curve parameters (front-end only; keep in sync with contract).
	// P0: starting price (in USDC per token, human-readable).
	//     Contract default ≈ 0.00007775486736425522 USDC.
	// K: curvature/scale factor for the bonding curve.
	//     Contract default ≈ 3.65280641579468.
	p0: 0.00007775486736425522,
	k: 3.65280641579468,
	chain: baseSepolia,
} as const;
