// api/stats.ts
// Simple mock stats API for the frontend. Deployed as a Vercel Serverless Function
// under /api/stats. This returns the three key metrics required by the UI plus
// a few extra fields that the hook already understands.
import type { VercelRequest, VercelResponse } from "@vercel/node";

type Payer = { address: string; txCount: number; total: string };
type TopHook = {
	address: string;
	txCount: number;
	uniquePayers: number;
	total: string;
};

// Deterministic mock helpers so results feel stable between requests
function hashString(s: string): number {
	let h = 2166136261 >>> 0;
	for (let i = 0; i < s.length; i++)
		h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
	return h >>> 0;
}

function pick<T>(arr: T[], n: number): T[] {
	return arr.slice(0, Math.max(0, Math.min(arr.length, n)));
}

const SAMPLE_NETWORKS = [
	"base",
	"x-layer",
	"base-sepolia",
	"x-layer-testnet",
] as const;
const SAMPLE_PAYERS: Payer[] = [
	{
		address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
		txCount: 18,
		total: "32500000",
	},
	{
		address: "0x66f820a414680B5bcda5eECA5dea238543F42054",
		txCount: 11,
		total: "18950000",
	},
	{
		address: "0xfe9e8709d3215310075d67E3ed32A380CCf451C8",
		txCount: 7,
		total: "7550000",
	},
	{
		address: "0x281055afc982d96Fab65b3a49cac8B878184Cb16",
		txCount: 5,
		total: "3200000",
	},
];

const SAMPLE_TOP_HOOKS: TopHook[] = [
	{
		address: "0x6b486aF5A08D27153d0374BE56A1cB1676c460a8",
		txCount: 22,
		uniquePayers: 14,
		total: "456780000",
	},
	{
		address: "0x817e4f0ee2fbdaac426f1178e149f7dc98873ecb",
		txCount: 16,
		uniquePayers: 9,
		total: "239990000",
	},
	{
		address: "0x1111111254EEB25477B68fb85Ed929f73A960582",
		txCount: 9,
		uniquePayers: 7,
		total: "120000000",
	},
];

export default function handler(req: VercelRequest, res: VercelResponse) {
	try {
		const { networks: networksParam, maxBlocks } = (req.query || {}) as Record<
			string,
			string | undefined
		>;

		// Parse the networks filter if provided; otherwise return a stable default
		let networks: string[] = SAMPLE_NETWORKS.slice(0, 2) as unknown as string[]; // ["base","x-layer"]
		if (typeof networksParam === "string" && networksParam.trim().length > 0) {
			networks = networksParam
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean);
			if (networks.length === 0)
				networks = SAMPLE_NETWORKS.slice(0, 2) as unknown as string[];
		}

		// Use a deterministic seed to vary totals based on inputs without being random
		const seed = hashString(
			[networks.join("|"), String(maxBlocks ?? "")].join("#"),
		);
		const baseTx = 10400; // 1200 - 1599
		const baseAccounts = 437; // 420 - 499
		const baseTotalAtomic = 987_654_321n + BigInt(seed % 250_000) * 1000n; // ~0.99M USDC atomic

		const body = {
			networks,
			transactionsCount: baseTx,
			accountsCount: baseAccounts,
			totalValueAtomic: baseTotalAtomic.toString(),
			payers: pick(SAMPLE_PAYERS, 3),
			topHooks: pick(SAMPLE_TOP_HOOKS, 3),
		};

		res.setHeader("Cache-Control", "no-store");
		res.status(200).json(body);
	} catch (err: any) {
		console.error("/api/stats error:", err);
		res.status(500).json({ error: err?.message ?? "internal error" });
	}
}
