import { useModalAppKit } from "@/components/modal-appkit-provider";
import {
	calculateBondingCurvePrice,
	estimateMintTokensForUsdc,
	executeTokenMint,
	fetchMintedTokens,
} from "@/lib/token-mint";
import {
	TOKEN_MINT_NETWORK,
	X402X_MINT_CONFIG,
	X402X_TOKEN_CONFIG,
} from "@/lib/token-mint-config";
import { useCallback, useEffect, useMemo, useState } from "react";

export type MintStatus = "idle" | "connecting" | "executing" | "success";

export type UseTokenMintOptions = Record<string, never>;

export type UseTokenMintResult = {
	status: MintStatus;
	isConnected: boolean;
	address?: string;
	error: string | null;
	txHash: string | null;
	// On-chain stats
	mintedTokens: number; // whole tokens already minted (approx)
	currentPrice: number | null; // USDC per token (approx)
	// UI helpers
	connectWallet: () => void;
	estimateTokensForUsdc: (amountUsdc: string) => Promise<number | null>;
	executeMint: (amountUsdc: string) => Promise<void>;
};

const DEFAULT_TOTAL_ALLOCATION = 1_000_000_000 / 10; // 10% of 1B

export function useTokenMint(
	_options: UseTokenMintOptions = {},
): UseTokenMintResult {
	// Minting is only supported on Base testnet (Base Sepolia).
	const networkKey = TOKEN_MINT_NETWORK;
	const mintContract = X402X_MINT_CONFIG.address;
	const totalAllocationTokens =
		X402X_TOKEN_CONFIG.mintAllocationTokens ?? DEFAULT_TOTAL_ALLOCATION;

	const { isConnected, address, openModal } = useModalAppKit();

	const [status, setStatus] = useState<MintStatus>("idle");
	const [error, setError] = useState<string | null>(null);
	const [txHash, setTxHash] = useState<string | null>(null);
	const [mintedTokens, setMintedTokens] = useState<number>(0);

	const connectWallet = useCallback(() => {
		setError(null);
		setStatus("connecting");
		openModal();
	}, [openModal]);

	// Reset "connecting" status once wallet is actually connected
	useEffect(() => {
		if (isConnected && status === "connecting") {
			setStatus("idle");
		}
	}, [isConnected, status]);

	// Read tokensSold from the mint contract to get the actual minted supply.
	useEffect(() => {
		let cancelled = false;
		async function load() {
			if (!address) return;
			const minted = await fetchMintedTokens({
				address: address as `0x${string}`,
				networkKey,
				mintContract,
			});
			if (cancelled || minted == null) return;
			setMintedTokens(minted);
		}

		void load();

		return () => {
			cancelled = true;
		};
	}, [address, networkKey, mintContract]);

	const currentPrice: number | null = useMemo(() => {
		const price = calculateBondingCurvePrice(
			mintedTokens,
			totalAllocationTokens,
		);
		return price || null;
	}, [mintedTokens, totalAllocationTokens]);

	const estimateTokensForUsdc = useCallback(
		async (amountUsdc: string): Promise<number | null> => {
			if (!isConnected || !address) return null;
			return estimateMintTokensForUsdc({
				amountUsdc,
				address: address as `0x${string}`,
				networkKey,
				mintContract,
			});
		},
		[isConnected, address, networkKey, mintContract],
	);

	const executeMint = useCallback(
		async (amountUsdc: string) => {
			setError(null);
			setTxHash(null);

			try {
				if (!isConnected || !address) {
					setError("Please connect wallet first.");
					connectWallet();
					return;
				}

				const value = amountUsdc.trim();
				if (!value) {
					setError("Please enter the amount of USDC");
					return;
				}

				setStatus("executing");

				const { txHash } = await executeTokenMint({
					amountUsdc: value,
					address: address as `0x${string}`,
					networkKey,
					mintContract,
				});

				setTxHash(txHash);
				setStatus("success");
			} catch (err) {
				setStatus("idle");
				setError("Token mint via x402x failed, please try again later");
			}
		},
		[isConnected, address, connectWallet, networkKey, mintContract],
	);

	return {
		status,
		isConnected,
		address,
		error,
		txHash,
		mintedTokens,
		currentPrice,
		connectWallet,
		estimateTokensForUsdc,
		executeMint,
	};
}
