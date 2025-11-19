// Lightweight client for the OKX Web3 DEX API via our signed proxy at /api/okx
// Only the bits we need for now: token list + token price

export type OkxToken = {
	chainId?: string | number;
	address: string;
	symbol: string;
	name: string;
	decimals?: number;
	logoURI?: string;
};

type OkxTokensResponse = {
	code?: string | number;
	msg?: string;
	data?: OkxToken[];
	// Some OKX responses also use `error_code`/`error_message`; keep tolerant parsing
	error_code?: string | number;
	error_message?: string;
};

const OKX_PROXY = "/api/okx"; // Vercel function that signs requests using server env vars

// Fetch token list for a given EVM chain using the OKX Aggregator all-tokens endpoint.
// Docs: https://web3.okx.com/build/dev-docs/wallet-api/dex-get-tokens
// Path: /api/v6/dex/aggregator/all-tokens?chainIndex=1
export async function okxGetTokens(params: {
	// We pass EVM chainId as OKX `chainIndex` (matches OKX example: 1 for Ethereum)
	chainId: number;
	// keyword/limit intentionally not sent; we only slice client-side
	keyword?: string;
	limit?: number; // client-side slice cap only
}): Promise<OkxToken[]> {
	const qs = new URLSearchParams();
	qs.set("path", "/api/v6/dex/aggregator/all-tokens");
	qs.set("chainIndex", String(params.chainId));

	const url = `${OKX_PROXY}?${qs.toString()}`;
	const res = await fetch(url, { headers: { Accept: "application/json" } });
	if (!res.ok) {
		// Return empty list instead of throwing; caller can fall back to local tokens
		return [];
	}
	const payload = (await res.json().catch(() => ({}))) as OkxTokensResponse;

	// OKX usually returns { code: '0', data: [...] } on success
	const code = payload?.code ?? payload?.error_code;
	if (code != null && String(code) !== "0") {
		return [];
	}

	const data = Array.isArray(payload?.data)
		? (payload!.data! as any[])
		: ([] as any[]);
	// Normalize minimal shape from OKX `all-tokens` response
	// Sample keys: tokenContractAddress, tokenSymbol, tokenName, tokenLogoUrl, decimals
	return data
		.map((t: any) => {
			const address = t.address ?? t.tokenContractAddress ?? "";
			const symbol = t.symbol ?? t.tokenSymbol ?? "";
			const name = t.name ?? t.tokenName ?? symbol;
			const decimalsRaw = t.decimals;
			const decimals =
				typeof decimalsRaw === "number"
					? decimalsRaw
					: typeof decimalsRaw === "string"
						? Number.parseInt(decimalsRaw, 10)
						: undefined;
			const logoURI = t.logoURI ?? t.tokenLogoUrl;
			return {
				chainId: t.chainId,
				address,
				symbol,
				name,
				decimals,
				logoURI,
			} as OkxToken;
		})
		.filter((t) => !!t.address && !!t.symbol);
}

// Get a DEX quote for swapping tokenIn -> tokenOut using OKX Aggregator.
// We proxy to: /api/v6/dex/aggregator/quote
// Typical parameters include:
// - chainIndex: EVM chain id (e.g., 1 for Ethereum)
// - baseTokenContractAddress: token you pay with (tokenIn)
// - quoteTokenContractAddress: token you receive (tokenOut)
// - baseTokenAmount: input amount in decimal string
// Some environments may also accept `amount` instead of `baseTokenAmount`.
// We include both to maximize compatibility; the server will ignore unknown ones.
export type OkxDexRoute = {
	dexName?: string;
	percent?: string; // e.g. '100'
	router?: string;
	dexProtocol?: any;
};

export type OkxQuote = {
	// Raw unit amounts from OKX
	rawAmountIn?: string; // fromTokenAmount (raw units)
	rawAmountOut?: string; // toTokenAmount (raw units)
	// Convenience: sometimes OKX returns other names; keep as soft alias
	amountOut?: string;
	// Meta
	tradeFeeUSD?: string; // tradeFee in USD
	estimateGasFee?: string; // smallest unit (e.g., wei)
	priceImpactPercent?: string; // '12.3' or '0.123' depending on API
	routes?: OkxDexRoute[];
	price?: number; // implied price if present
	data?: any; // full payload for debugging/future use
};

export async function okxGetQuote(params: {
	chainId: number;
	tokenIn: string; // fromTokenAddress
	tokenOut: string; // toTokenAddress
	amountRaw: string; // raw units string (includes precision)
}): Promise<OkxQuote | null> {
	const qs = new URLSearchParams();
	qs.set("path", "/api/v6/dex/aggregator/quote");
	qs.set("chainIndex", String(params.chainId));
	qs.set("fromTokenAddress", params.tokenIn);
	qs.set("toTokenAddress", params.tokenOut);
	qs.set("amount", params.amountRaw);
	qs.set("swapMode", "exactIn"); // we only support exactIn mode

	const url = `${OKX_PROXY}?${qs.toString()}`;
	const res = await fetch(url, { headers: { Accept: "application/json" } });
	if (!res.ok) return null;
	const payload = (await res.json().catch(() => ({}))) as any;
	const raw = payload?.data ?? payload;

	// Some OKX deployments return an array of route quotes; choose the best one.
	// Heuristic: pick the entry with the largest toTokenAmount (raw units).
	const pickBest = (arr: any[]): any => {
		if (!Array.isArray(arr) || arr.length === 0) return undefined;
		try {
			return (
				arr.slice().sort((a, b) => {
					try {
						const va = BigInt(a?.toTokenAmount ?? "0");
						const vb = BigInt(b?.toTokenAmount ?? "0");
						if (va === vb) return 0;
						return va > vb ? -1 : 1;
					} catch {
						return 0;
					}
				})[0] ?? arr[0]
			);
		} catch {
			return arr[0];
		}
	};

	const data = Array.isArray(raw) ? pickBest(raw) : raw;

	const out: OkxQuote = { data };
	// Primary raw amounts on root
	if (typeof data?.fromTokenAmount === "string")
		out.rawAmountIn = data.fromTokenAmount;
	if (typeof data?.toTokenAmount === "string")
		out.rawAmountOut = data.toTokenAmount;
	// Fallbacks (e.g., inside quoteCompareList)
	const firstCompare = Array.isArray(data?.quoteCompareList)
		? data.quoteCompareList[0]
		: undefined;
	if (!out.rawAmountOut && typeof firstCompare?.amountOut === "string")
		out.rawAmountOut = firstCompare.amountOut;
	// Keep soft alias
	out.amountOut = out.rawAmountOut;

	// Meta fields
	if (typeof data?.tradeFee === "string") out.tradeFeeUSD = data.tradeFee;
	if (typeof data?.estimateGasFee === "string")
		out.estimateGasFee = data.estimateGasFee;
	if (typeof data?.priceImpactPercent === "string")
		out.priceImpactPercent = data.priceImpactPercent;
	if (
		!out.priceImpactPercent &&
		typeof firstCompare?.priceImpactPercent === "string"
	)
		out.priceImpactPercent = firstCompare.priceImpactPercent;

	// Route list
	if (Array.isArray(data?.dexRouterList)) {
		out.routes = data.dexRouterList.map((r: any) => ({
			dexName: r?.dexProtocol?.dexName ?? r?.dexName,
			percent: r?.dexProtocol?.percent ?? r?.percent,
			router: r?.router,
			dexProtocol: r?.dexProtocol,
		}));
	}

	// Optional price if present
	if (typeof data?.price === "number") out.price = data.price;
	if (typeof data?.price === "string") {
		const p = Number.parseFloat(data.price);
		if (Number.isFinite(p)) out.price = p;
	}

	return out;
}

// Build executable swap transaction calldata via OKX Aggregator.
// We proxy to: /api/v6/dex/aggregator/swap (naming may vary across OKX deployments).
// The function attempts to be tolerant to minor schema differences and will
// normalize the common fields required for execution.
export type OkxSwapTx = {
	// Target contract to call (typically the OKX aggregator/router)
	aggregatorAddress: string;
	// Encoded calldata (must include the 4-byte selector)
	data: `0x${string}`;
};

export async function okxBuildSwapTx(params: {
	chainId: number;
	fromToken: string; // tokenIn (asset you pay with)
	toToken: string; // tokenOut (asset you receive)
	amountRaw: string; // raw input amount (atomic units of fromToken)
	slippagePercent?: number; // e.g. 0.5, 1, 3
	userAddress: string; // recipient/beneficiary of the swap
}): Promise<OkxSwapTx | null> {
	// Compose query tolerated by OKX proxy; include both canonical and alt keys
	const qs = new URLSearchParams();
	qs.set("path", "/api/v6/dex/aggregator/swap");
	qs.set("chainIndex", String(params.chainId));
	qs.set("fromTokenAddress", params.fromToken);
	qs.set("toTokenAddress", params.toToken);
	qs.set("amount", params.amountRaw);
	qs.set("userWalletAddress", params.userAddress);
	// exactIn mode for deterministic minOut computation
	qs.set("swapMode", "exactIn");
	// Slippage as percentage string; add a couple common aliases just in case
	if (params.slippagePercent != null) {
		const s = String(params.slippagePercent);
		qs.set("slippagePercent", s);
	}

	const url = `${OKX_PROXY}?${qs.toString()}`;
	const res = await fetch(url, { headers: { Accept: "application/json" } });
	if (!res.ok) return null;

	const payload = (await res.json().catch(() => ({}))) as any;
	const data = payload?.data ?? payload;
	const tx = data[0]?.tx;

	const to = tx?.to;
	const calldata = tx?.data;

	if (!to || typeof calldata !== "string") {
		return null;
	}

	return {
		aggregatorAddress: to,
		data: calldata as `0x${string}`,
	} satisfies OkxSwapTx;
}

// Get approve transaction data via OKX Aggregator.
// We proxy to: /api/v6/dex/aggregator/approve-transaction
// This returns the transaction data needed to approve tokens for swapping.
// Reference: https://web3.okx.com/zh-hans/build/dev-docs/wallet-api/dex-approve-transaction
export type OkxApproveTx = {
	// Address to approve tokens to (dexContractAddress from API response)
	approveAddress: string;
	// Encoded approve transaction calldata
	data: `0x${string}`;
	// Gas limit for the approve transaction
	gasLimit?: string;
	// Gas price for the approve transaction
	gasPrice?: string;
};

export async function okxGetApproveTx(params: {
	chainId: number;
	tokenAddress: string; // token to approve
	approveAmount: string; // amount to approve (in atomic units, e.g., "1000000" for 1 USDC with 6 decimals)
}): Promise<OkxApproveTx | null> {
	const qs = new URLSearchParams();
	qs.set("path", "/api/v6/dex/aggregator/approve-transaction");
	qs.set("chainIndex", String(params.chainId));
	qs.set("tokenContractAddress", params.tokenAddress);
	qs.set("approveAmount", params.approveAmount);

	const url = `${OKX_PROXY}?${qs.toString()}`;
	const res = await fetch(url, { headers: { Accept: "application/json" } });
	if (!res.ok) return null;

	const payload = (await res.json().catch(() => ({}))) as any;
	
	// Check for error code
	const code = payload?.code;
	if (code != null && String(code) !== "0") {
		return null;
	}

	// Response format: { code: "0", data: [{ data, dexContractAddress, gasLimit, gasPrice }], msg: "" }
	const dataArray = Array.isArray(payload?.data) ? payload.data : [];
	const approveData = dataArray[0];
    console.log(approveData)

	if (!approveData) {
		return null;
	}

	const dexContractAddress = approveData?.dexContractAddress;
	const calldata = approveData?.data;
	const gasLimit = approveData?.gasLimit;
	const gasPrice = approveData?.gasPrice;

	// dexContractAddress and data are required
	if (!dexContractAddress || typeof calldata !== "string") {
		return null;
	}

	return {
		approveAddress: dexContractAddress,
		data: calldata as `0x${string}`,
		gasLimit: typeof gasLimit === "string" ? gasLimit : undefined,
		gasPrice: typeof gasPrice === "string" ? gasPrice : undefined,
	} satisfies OkxApproveTx;
}
