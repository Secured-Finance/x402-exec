import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { okxGetQuote } from "@/lib/okx";
import { useEffect, useRef, useState } from "react";
import { formatUnits, parseUnits } from "viem";

export type TokenShape = {
	address?: string;
	decimals?: number;
};

export function useSwapQuoteExactIn(params: {
    chainId?: number;
    fromToken?: TokenShape;
    toToken?: TokenShape;
    amountIn?: string; // human units string
    debounceMs?: number;
    enabled?: boolean; // when false, no quote is fetched and output remains empty
}) {
    const { chainId, fromToken, toToken, amountIn, debounceMs = 450, enabled = true } = params;

	const { debounced: debouncedAmountIn, isDebouncing } = useDebouncedValue(
		amountIn ?? "",
		debounceMs,
	);

	const [toAmount, setToAmount] = useState("");
	const [meta, setMeta] = useState<{
		tradeFeeUSD?: string;
		priceImpactPercent?: string;
	} | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);
	const reqIdRef = useRef(0);

    // biome-ignore lint/correctness/useExhaustiveDependencies: <>
    useEffect(() => {
        const amt = debouncedAmountIn?.trim();

        // Disabled: clear outputs and stop
        if (!enabled) {
            setToAmount("");
            setMeta(null);
            setError(null);
            setLoading(false);
            return;
        }

		// Reset state when not ready
		if (!chainId || !fromToken?.address || !toToken?.address) {
			setToAmount("");
			setMeta(null);
			setError(null);
			setLoading(false);
			return;
		}

		// Invalid/empty input -> clear
		const amtNum = Number(amt);
		if (!amt || Number.isNaN(amtNum) || amtNum <= 0) {
			setToAmount("");
			setMeta(null);
			setError(null);
			setLoading(false);
			return;
		}

		const rid = ++reqIdRef.current;
		setLoading(true);
		setError(null);
		setMeta(null);

		(async () => {
			// Prepare raw amount with decimals from fromToken
			let amountRaw = "0";
			try {
				amountRaw = parseUnits(amt!, fromToken.decimals ?? 18).toString();
			} catch {
				amountRaw = "0";
			}

			try {
				const q = await okxGetQuote({
					chainId: chainId!,
					tokenIn: fromToken.address!,
					tokenOut: toToken.address!,
					amountRaw,
				});
				if (reqIdRef.current !== rid) return; // stale

				if (q) {
					const qToDecRaw = (q as any)?.data?.toToken?.decimal;
					const qToDecimals =
						typeof qToDecRaw === "string"
							? Number.parseInt(qToDecRaw, 10)
							: undefined;
					const toDecimals = Number.isFinite(qToDecimals as number)
						? (qToDecimals as number)
						: (toToken.decimals ?? 18);
					const rawOut = q.rawAmountOut || q.amountOut || "0";
					let display = "0";
					try {
						display = formatUnits(BigInt(rawOut), toDecimals);
					} catch {}
					const [i, d = ""] = display.split(".");
					const t = d.replace(/0+$/, "").slice(0, 6);
					display = t ? `${i}.${t}` : i;
					setToAmount(display);
					setMeta({
						tradeFeeUSD: q.tradeFeeUSD,
						priceImpactPercent: q.priceImpactPercent,
					});
					setError(null);
				} else {
					setMeta(null);
					setError(new Error("quote_unavailable"));
				}
			} catch {
				if (reqIdRef.current !== rid) return; // stale
				setMeta(null);
				setError(new Error("quote_failed"));
				setToAmount("");
			} finally {
				if (reqIdRef.current === rid) setLoading(false);
			}
		})();
    }, [
        chainId,
        fromToken?.address,
        toToken?.address,
        fromToken?.decimals,
        toToken?.decimals,
        debouncedAmountIn,
        enabled,
    ]);

    return {
        toAmount,
        loading,
        meta,
        error,
        isDebouncing,
        debouncedAmountIn,
    } as const;
}
