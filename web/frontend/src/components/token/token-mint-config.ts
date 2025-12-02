// Central configuration for the $X402X token mint.
// Update this file to change contract addresses, ABIs and sale parameters.

export type ContractAbi = readonly unknown[];

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
	address: "0x5a2dcE590df31613c2945baf22C911992087AF57" as `0x${string}`,

	// ABI for the $X402X token contract (ERC20). Fill in with the real ABI if needed.
	abi: [] as ContractAbi,
} as const;

export const X402X_MINT_CONFIG = {
	// Mint / hook contract that receives USDC and mints $X402X (used as x402x hook).
	address: "0x31056312dE16C4e4518daA0fFE26eEff4927Fc89" as `0x${string}`,

	// ABI for the mint / hook contract. Fill in with the real ABI for on-chain reads or
	// for encoding hookData if you need more advanced flows.
	abi: [] as ContractAbi,
} as const;
