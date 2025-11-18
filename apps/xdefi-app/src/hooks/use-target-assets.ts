import {
	NATIVE_TOKEN_ADDRESS,
	SUPPORTED_NETWORKS,
	SUPPORTED_PAYMENT_TOKENS,
} from "@/constants/networks";
import { okxGetTokens } from "@/lib/okx";
import { useEffect, useMemo, useState } from "react";

// Local shapes aligned to crypto-swap component
export type TargetToken = {
	symbol: string;
	name: string;
	address: string;
	price: number;
	balance: string;
	change24h: number;
	logoUrl?: string;
	decimals?: number;
};

export type TargetNetwork = {
	id: string; // network key
	name: string; // display name (e.g., Base)
	tokens: TargetToken[];
};

export type UseTargetAssetsParams = {
	fromNetworkId?: string;
	enabled?: boolean; // only fetch when enabled (e.g., when opening the 'to' selector)
	excludeAddress?: string; // exclude this token address from results
};

export function useTargetAssets({
	fromNetworkId,
	enabled = false,
	excludeAddress,
}: UseTargetAssetsParams) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [networks, setNetworks] = useState<TargetNetwork[]>(() => []);

	// Compute target networks (without tokens). Tokens will be populated from OKX.
	const targets = useMemo(() => {
		// SUPPORTED_NETWORKS is filtered to mainnet only.
		const candidates = SUPPORTED_NETWORKS;

		const pickList = (() => {
			if (!fromNetworkId) return candidates;
			return candidates.filter((n) => n.network === fromNetworkId);
		})();

		return pickList.map((n) => ({
			key: n.network,
			name:
				n.status === "Mainnet" ? n.name.replace(/\s*Mainnet\b/i, "") : n.name,
			chainId: n.chainId,
		}));
	}, [fromNetworkId]);

	useEffect(() => {
		let cancelled = false;
		if (!enabled) {
			setNetworks([]);
			setLoading(false);
			setError(null);
			return () => {
				cancelled = true;
			};
		}

		setLoading(true);
		setError(null);

		async function run() {
			// Fetch tokens per target network via OKX. Fall back to SDK tokens if empty/error.
			const results = await Promise.all(
				targets.map(async (t) => {
					try {
						const okxTokens = await okxGetTokens({
							chainId: t.chainId,
							limit: 200,
						});
						const mapped: TargetToken[] = (okxTokens ?? [])
							.slice(0, 200)
							.map((tok) => ({
								symbol: tok.symbol,
								name: tok.name ?? tok.symbol,
								address: tok.address,
								price: 1,
								balance: "0",
								change24h: 0,
								logoUrl: tok.logoURI,
								decimals: tok.decimals,
							}))
							.filter(
								(tok) =>
									!excludeAddress ||
									tok.address.toLowerCase() !== excludeAddress.toLowerCase(),
							);

						// Deduplicate by address (first occurrence wins)
						const dedupMap = new Map<string, TargetToken>();
						for (const tok of mapped) {
							const key = tok.address.toLowerCase();
							if (!dedupMap.has(key)) dedupMap.set(key, tok);
						}
						let tokensFromOkx = Array.from(dedupMap.values());
						// Move native token (OKX native address) to the front when present
						const nativeIdx = tokensFromOkx.findIndex(
							(x) =>
								x.address.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase(),
						);
						if (nativeIdx > 0) {
							const nativeTok = tokensFromOkx.splice(nativeIdx, 1)[0];
							tokensFromOkx = [nativeTok, ...tokensFromOkx];
						}

						// If OKX returned nothing, fall back to our minimal supported token list (USDC)
						const fallbackList = (SUPPORTED_PAYMENT_TOKENS[t.key] ?? []).map(
							(x) => ({
								symbol: x.symbol,
								name: x.label ?? x.symbol,
								address: x.address,
								price: 1,
								balance: "0",
								change24h: 0,
								decimals: x.symbol.toUpperCase() === "USDC" ? 6 : 18,
							}),
						);

						const tokens: TargetToken[] =
							tokensFromOkx.length > 0 ? tokensFromOkx : fallbackList;
						return { id: t.key, name: t.name, tokens } as TargetNetwork;
					} catch (e) {
						// On error, use fallback tokens to keep the UI functional (no synthetic native)
						const fallbackList = (SUPPORTED_PAYMENT_TOKENS[t.key] ?? []).map(
							(x) => ({
								symbol: x.symbol,
								name: x.label ?? x.symbol,
								address: x.address,
								price: 1,
								balance: "0",
								change24h: 0,
								decimals: x.symbol.toUpperCase() === "USDC" ? 6 : 18,
							}),
						);
						return {
							id: t.key,
							name: t.name,
							tokens: fallbackList,
						} as TargetNetwork;
					}
				}),
			);

			if (cancelled) return;
			setNetworks(results);
			setLoading(false);
		}

		run();
		return () => {
			cancelled = true;
		};
	}, [targets, enabled, excludeAddress]);

	const refresh = () => {
		// Trigger effect by changing dependency identity
		setLoading(true);
		setTimeout(() => setLoading(false), 50);
	};

	return { networks, loading, error, refresh };
}
