import { FACILITATOR_HOSTED_URL } from "@/constants/facilitator";
import { tokenMintABI } from "@/hooks/token-mint-abi";
import {
	TOKEN_MINT_NETWORK,
	X402X_MINT_CONFIG,
	X402X_TOKEN_CONFIG,
} from "@/lib/token-mint-config";
import { modal as appKitModal } from "@reown/appkit/react";
import { X402Client } from "@x402x/client";
import {
	createPublicClient,
	createWalletClient,
	custom,
	formatUnits,
	http,
	parseUnits,
	publicActions,
} from "viem";

type TokenMintContext = {
	address: `0x${string}`;
	networkKey: string;
	mintContract: `0x${string}`;
};

// Bonding curve helper – mirrors the contract's exponential model approximately:
// P(x) ≈ P0 * exp(k * x), where x = tokensSold / TOTAL_SALE_SUPPLY (0..1).
// We use the human-readable P0/k from config; keep them in sync with the contract.
export function calculateBondingCurvePrice(
	mintedTokens: number,
	totalAllocationTokens: number,
): number {
	if (!Number.isFinite(mintedTokens) || mintedTokens < 0) return 0;
	if (!Number.isFinite(totalAllocationTokens) || totalAllocationTokens <= 0)
		return 0;

	const basePrice = X402X_MINT_CONFIG.p0 ?? 0.01;
	const k = X402X_MINT_CONFIG.k ?? 1;
	const progress = Math.min(
		Math.max(mintedTokens / totalAllocationTokens, 0),
		1,
	); // 0..1

	// Exponential curve: price grows as P0 * exp(k * x)
	const price = basePrice * Math.exp(k * progress);
	return Number.isFinite(price) ? price : 0;
}

export async function fetchMintedTokens(
	params: TokenMintContext,
): Promise<number | null> {
	const { mintContract } = params;

	try {
		const client = createPublicClient({
			chain: X402X_MINT_CONFIG.chain,
			transport: http(),
		}).extend(publicActions);

		const sold = (await client.readContract({
			address: mintContract,
			abi: tokenMintABI,
			functionName: "tokensSold",
		})) as bigint;

		const decimals = X402X_TOKEN_CONFIG.decimals ?? 18;
		// Convert on-chain atomic units -> human-readable using viem helper.
		const raw = Number(formatUnits(sold, decimals));
		// For supply/progress we only need whole tokens; fractional part is negligible.
		const whole = Math.floor(raw);

		return Number.isFinite(whole) ? whole : null;
	} catch (error) {
		// Surface this as a silent failure; caller can decide whether to log.
		console.log(error);
		return null;
	}
}

export async function estimateMintTokensForUsdc({
	amountUsdc,
	...rest
}: TokenMintContext & {
	amountUsdc: string;
}): Promise<number | null> {
	const { mintContract } = rest;

	const raw = amountUsdc.trim();
	if (!raw) return null;

	let amountAtomic: bigint;
	try {
		amountAtomic = parseUnits(raw, 6);
		if (amountAtomic <= 0n) return null;
	} catch {
		return null;
	}

	const client = createPublicClient({
		chain: X402X_MINT_CONFIG.chain,
		transport: http(),
	}).extend(publicActions);

	try {
		const tokens = (await client.readContract({
			address: mintContract,
			abi: tokenMintABI,
			functionName: "calculateTokensForUsdc",
			args: [amountAtomic],
		})) as bigint;

		const decimals = X402X_TOKEN_CONFIG.decimals ?? 18;
		// Use viem helper to preserve decimals; this is just an approximate preview.
		const asNumber = Number(formatUnits(tokens, decimals));
		const result = Number.isFinite(asNumber) ? asNumber : null;
		return result;
	} catch {
		return null;
	}
}

export async function executeTokenMint({
	amountUsdc,
	...context
}: TokenMintContext & {
	amountUsdc: string;
}): Promise<{ txHash: string }> {
	const { address, mintContract } = context;

	const value = amountUsdc.trim();
	if (!value) {
		throw new Error("Please enter the amount of USDC");
	}

	let amountAtomic: bigint;
	try {
		// Interpret user input as human-readable USDC (decimals = 6)
		amountAtomic = parseUnits(value, 6);
		if (amountAtomic <= 0n) {
			throw new Error("USDC amount must > 0");
		}
	} catch (err) {
		if (err instanceof Error && err.message === "USDC amount must > 0") {
			throw err;
		}
		throw new Error("Please enter a valid number");
	}

	if (typeof window === "undefined") {
		throw new Error("Wallet is only available in a browser environment");
	}

	const appKit = appKitModal;
	if (!appKit) {
		throw new Error("Wallet is not initialized. Please reload and try again.");
	}

	// Prefer AppKit's active wallet provider instead of reading window.ethereum directly.
	const provider = appKit.getWalletProvider?.();
	if (!provider) {
		throw new Error(
			"No connected wallet provider found. Please connect your wallet.",
		);
	}

	const wallet = createWalletClient({
		account: address,
		chain: X402X_MINT_CONFIG.chain,
		transport: custom(provider as any),
	}).extend(publicActions);

	const facilitatorUrl = FACILITATOR_HOSTED_URL.replace(/\/$/, "");

	const client = new X402Client({
		wallet: wallet as any,
		network: TOKEN_MINT_NETWORK,
		facilitatorUrl,
	});

	const result = await client.execute({
		hook: mintContract,
		hookData: "0x",
		amount: amountAtomic.toString(),
		payTo: address,
	});

	return { txHash: result.txHash };
}
