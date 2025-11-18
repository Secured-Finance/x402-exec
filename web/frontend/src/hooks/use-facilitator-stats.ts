import * as React from "react";

export type FacilitatorPayer = {
	address: string;
	txCount: number;
	total: string; // atomic units (USDC)
};

export type FacilitatorStats = {
	networks: string[];
	transactionsCount: number;
	accountsCount: number;
	totalValueAtomic: string; // sum of amounts (USDC atomic units)
	payers: FacilitatorPayer[];
	topHooks?: Array<{
		address: string;
		txCount: number;
		uniquePayers: number;
		total: string;
	}>;
};

export type UseFacilitatorStatsOptions = {
	networks?: string[]; // optional filter (e.g., ["base","x-layer"])
	maxBlocks?: number; // lookback window per network
};

export function useFacilitatorStats(opts: UseFacilitatorStatsOptions = {}) {
	const [data, setData] = React.useState<FacilitatorStats | null>(null);
	const [loading, setLoading] = React.useState<boolean>(true);
	const [error, setError] = React.useState<string | null>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <>
	React.useEffect(() => {
		let cancelled = false;
		async function run() {
			setLoading(true);
			setError(null);
			try {
				const params = new URLSearchParams();
				if (opts.networks && opts.networks.length) {
					params.set("networks", opts.networks.join(","));
				}
				if (
					typeof opts.maxBlocks === "number" &&
					Number.isFinite(opts.maxBlocks)
				) {
					params.set("maxBlocks", String(opts.maxBlocks));
				}
				// Query our local API route (Vercel serverless in /api/stats)
				const url = `/api/stats${params.toString() ? `?${params.toString()}` : ""}`;
				const resp = await fetch(url, {
					headers: { Accept: "application/json" },
				});
				if (!resp.ok) {
					throw new Error(`HTTP ${resp.status}`);
				}
				const json = (await resp.json()) as FacilitatorStats;
				if (!cancelled) setData(json);
			} catch (err) {
				if (!cancelled)
					setError(err instanceof Error ? err.message : String(err));
			} finally {
				if (!cancelled) setLoading(false);
			}
		}
		run();
		return () => {
			cancelled = true;
		};
	}, [(opts.networks || []).join(","), opts.maxBlocks]);

	return { data, loading, error } as const;
}

// Utility: convert USDC atomic (6 decimals) to display number
export function formatUsdcAtomicToDisplay(
	atomic: string | bigint | number,
	fractionDigits = 2,
): string {
	try {
		const big = typeof atomic === "bigint" ? atomic : BigInt(atomic);
		const int = big / 1000000n;
		const frac = big % 1000000n;
		// Build fixed with 6 decimals then slice
		const fracStr = frac.toString().padStart(6, "0");
		const shown = fracStr.slice(0, fractionDigits);
		const trimmed = shown.replace(/0+$/, "");
		return trimmed.length > 0 ? `${int.toString()}.${trimmed}` : int.toString();
	} catch {
		return "0";
	}
}
