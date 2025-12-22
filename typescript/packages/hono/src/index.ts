/**
 * x402x Hono middleware
 *
 * Provides payment middleware for Hono-based resource servers with settlement support.
 * Compatible with x402 official middleware API with x402x extensions.
 */

import type { Context } from "hono";
import { exact } from "x402/schemes";
import {
  computeRoutePatterns,
  findMatchingPaymentRequirements,
  findMatchingRoute,
  processPriceToAtomicAmount,
  toJsonSafe,
} from "x402/shared";
import {
  FacilitatorConfig,
  moneySchema,
  PaymentPayload,
  PaymentRequirements,
  Resource,
  settleResponseHeader,
  type Money,
  type Network,
} from "x402/types";
import { useFacilitator } from "x402/verify";
import {
  addSettlementExtra,
  getNetworkConfig,
  getSupportedNetworks,
  TransferHook,
  calculateFacilitatorFee,
  type FeeCalculationResult,
} from "@secured-finance/x402-core";
import type { Address } from "viem";
import type { Address as SolanaAddress } from "@solana/kit";

/**
 * Payment context information available to handlers via c.get('x402')
 *
 * This is an x402x extension that provides access to payment details
 * after successful verification, enabling secure business logic that
 * depends on the payer's identity or payment amount.
 */
export interface X402Context {
  /** Address of the payer (from payment signature) */
  payer: Address | SolanaAddress;

  /** Payment amount in atomic units (e.g., USDC with 6 decimals) */
  amount: string;

  /** Network where payment was made */
  network: Network;

  /** Decoded payment payload */
  payment: PaymentPayload;

  /** Matched payment requirements */
  requirements: PaymentRequirements;

  /** Transaction hash (populated after settlement, may be undefined initially) */
  transactionHash?: string;

  /** Settlement information (x402x specific, undefined for standard x402) */
  settlement?: {
    /** SettlementRouter address */
    router: Address;
    /** Hook contract address */
    hook: Address;
    /** Encoded hook data */
    hookData: string;
    /** Facilitator fee in atomic units */
    facilitatorFee: string;
  };
}

/**
 * x402x-specific route configuration
 */
export interface X402xRouteConfig {
  /**
   * Price for the resource. Recommended format (matches x402 official middleware):
   * - Dollar string: '$0.01', '$1.00'
   * - Number: 0.01, 1.00 (interpreted as USD)
   * - String number: '0.01', '1.00' (interpreted as USD)
   */
  price: string | Money;

  /** Network(s) to support - can be a single network or array for multi-network support */
  network: Network | Network[];

  /** Hook address - defaults to TransferHook for the network */
  hook?: string | ((network: Network) => string);

  /** Encoded hook data - defaults to empty data */
  hookData?: string | ((network: Network) => string);

  // facilitatorFee supports two modes:
  // 1. Not configured or "auto" (default) -> query from facilitator automatically
  // 2. Configured with specific value -> use static fee (backward compatible)
  facilitatorFee?: "auto" | string | Money | ((network: Network) => string | Money);

  /**
   * Maximum fee as a percentage of payment (0-1). Default: 0.1 (10%)
   * When dynamic fee exceeds this percentage of payment, it will be capped.
   * Set to 1 to disable capping.
   * 
   * Example: maxFeePercentage: 0.03 means fee cannot exceed 3% of payment
   */
  maxFeePercentage?: number;

  /** Standard x402 configuration */
  config?: {
    description?: string;
    mimeType?: string;
    maxTimeoutSeconds?: number;
    resource?: Resource;
    errorMessages?: {
      paymentRequired?: string;
      invalidPayment?: string;
      noMatchingRequirements?: string;
      verificationFailed?: string;
      settlementFailed?: string;
    };
  };
}

/**
 * Routes configuration - can be:
 * 1. Simple config for all routes: X402xRouteConfig
 * 2. Per-route config: Record<string, X402xRouteConfig>
 */
export type X402xRoutesConfig = X402xRouteConfig | Record<string, X402xRouteConfig>;

/**
 * Creates a payment middleware for Hono with x402x settlement support
 *
 * This middleware is compatible with x402 official middleware API but adds
 * settlement extension support for executing on-chain hooks.
 *
 * @param payTo - The final recipient address (used in hook, not as SettlementRouter)
 * @param routes - Configuration for protected routes and their payment requirements
 * @param facilitator - Configuration for the payment facilitator service
 * @returns A Hono middleware handler
 *
 * @example
 * Simple usage - single network with default TransferHook:
 * ```typescript
 * import { Hono } from 'hono';
 * import { paymentMiddleware } from '@secured-finance/x402-hono';
 *
 * const app = new Hono();
 *
 * app.use('/api/*', paymentMiddleware(
 *   '0xRecipient...', // Final recipient
 *   {
 *     price: '$0.01',
 *     network: 'base-sepolia',
 *     // hook defaults to TransferHook
 *     // hookData defaults to empty
 *   },
 *   { url: 'https://facilitator.x402.org' }
 * ));
 * ```
 *
 * @example
 * Multi-network support:
 * ```typescript
 * app.use('/api/*', paymentMiddleware(
 *   '0xRecipient...',
 *   {
 *     price: '$0.10', // Price in USD
 *     network: ['base-sepolia', 'x-layer-testnet'], // Multiple networks!
 *   },
 *   facilitator
 * ));
 * ```
 *
 * @example
 * Custom hook configuration:
 * ```typescript
 * app.post('/api/referral', paymentMiddleware(
 *   '0xPlatform...',
 *   {
 *     price: '$0.20', // Price in USD
 *     network: 'base-sepolia',
 *     hook: '0xReferralHook...',
 *     hookData: encodeReferralData(referrer, split),
 *     facilitatorFee: '$0.02', // Fee in USD (same format as price)
 *   },
 *   facilitator
 * ));
 * ```
 *
 * @example
 * Route-specific configuration:
 * ```typescript
 * app.use(paymentMiddleware(
 *   '0xRecipient...',
 *   {
 *     '/api/basic': {
 *       price: '$0.01',
 *       network: 'base-sepolia',
 *     },
 *     'POST /api/premium': {
 *       price: '$0.10', // Price in USD
 *       network: ['base-sepolia', 'polygon'],
 *       facilitatorFee: '$0.01', // Fee in USD (same format as price)
 *     },
 *   },
 *   facilitator
 * ));
 * ```
 */
export function paymentMiddleware(
  payTo: string,
  routes: X402xRoutesConfig,
  facilitator?: FacilitatorConfig,
) {
  const { verify, settle } = useFacilitator(facilitator);
  const x402Version = 1;

  // Normalize routes to per-route config
  const isSimpleConfig = "price" in routes && "network" in routes;
  const normalizedRoutes = isSimpleConfig
    ? { "*": routes as X402xRouteConfig }
    : (routes as Record<string, X402xRouteConfig>);

  // Pre-compile route patterns to regex
  const routePatterns = computeRoutePatterns(
    Object.fromEntries(
      Object.entries(normalizedRoutes).map(([pattern, config]) => [
        pattern,
        {
          price: config.price,
          network: Array.isArray(config.network) ? config.network[0] : config.network,
        },
      ]),
    ),
  );

  return async function middleware(c: Context, next: () => Promise<void>) {
    const method = c.req.method.toUpperCase();
    const matchingRoute = findMatchingRoute(routePatterns, c.req.path, method);

    if (!matchingRoute) {
      return next();
    }

    // Get the original config for this route
    const routeKey = Object.keys(normalizedRoutes).find((pattern) => {
      const [verb, path] = pattern.includes(" ") ? pattern.split(/\s+/) : ["*", pattern];
      if (verb !== "*" && verb.toUpperCase() !== method) return false;
      const regex = new RegExp(
        `^${(path || pattern)
          .replace(/[$()+.?^{|}]/g, "\\$&")
          .replace(/\*/g, ".*?")
          .replace(/\[([^\]]+)\]/g, "[^/]+")
          .replace(/\//g, "\\/")}$`,
        "i",
      );
      return regex.test(c.req.path);
    });

    const routeConfig = routeKey ? normalizedRoutes[routeKey] : normalizedRoutes["*"];
    if (!routeConfig) {
      return next();
    }

    const {
      price,
      network: networkConfig,
      hook,
      hookData,
      facilitatorFee,
      config = {},
    } = routeConfig;
    const { description, mimeType, maxTimeoutSeconds, resource, errorMessages } = config;

    // Try to decode payment first to check if client submitted paymentRequirements
    const payment = c.req.header("X-PAYMENT");
    let decodedPayment: PaymentPayload | undefined;
    let clientSubmittedRequirements: PaymentRequirements | undefined;

    if (payment) {
      try {
        decodedPayment = exact.evm.decodePayment(payment);
        decodedPayment.x402Version = x402Version;
        // Use client-submitted paymentRequirements if available
        // This ensures parameters like salt remain consistent throughout the flow
        clientSubmittedRequirements = decodedPayment.paymentRequirements;

        // Debug: log client-submitted requirements
        if (clientSubmittedRequirements) {
          console.log("[x402x Middleware] Client submitted paymentRequirements:", {
            path: c.req.path,
            network: clientSubmittedRequirements.network,
            extra: clientSubmittedRequirements.extra,
          });
        }
      } catch (error) {
        // Decoding failed - try manual decode for custom networks
        console.error("[x402x Middleware] Failed to decode payment:", error);

        // Manual decode: base64 decode and JSON parse the X-PAYMENT header
        try {
          const paymentJson = JSON.parse(Buffer.from(payment, 'base64').toString('utf-8'));
          decodedPayment = paymentJson as PaymentPayload;
          decodedPayment.x402Version = x402Version;
          clientSubmittedRequirements = decodedPayment.paymentRequirements;
          console.log("[x402x Middleware] Manual decode successful for custom network:", clientSubmittedRequirements?.network);
        } catch (manualError) {
          console.error("[x402x Middleware] Manual decode also failed:", manualError);
        }
      }
    }

    let paymentRequirements: PaymentRequirements[];

    // If client submitted paymentRequirements, use them directly
    // This is critical for x402x: the salt must remain the same from 402 response to payment verification
    if (clientSubmittedRequirements) {
      paymentRequirements = [clientSubmittedRequirements];
    } else {
      // Build PaymentRequirements for each network (first request, no payment yet)
      paymentRequirements = [];

      // Support network array
      const networks = Array.isArray(networkConfig) ? networkConfig : [networkConfig];

      for (const network of networks) {
        // Only support networks from @secured-finance/x402-core (includes custom networks)
        if (!getSupportedNetworks().includes(network)) {
          continue;
        }

        // Get network config from @secured-finance/x402-core
        const x402xConfig = getNetworkConfig(network);

        // Calculate price using correct decimals from @secured-finance/x402-core
        // x402's processPriceToAtomicAmount hardcodes 6 decimals, but JPYC has 18 decimals
        let baseAmount: string;
        let asset: any;

        // Always use our config for networks with custom tokens (sepolia, filecoin-calibration)
        // For other networks, try x402's processPriceToAtomicAmount first
        const customTokenNetworks = ['sepolia', 'filecoin-calibration'];

        // Token USD rates for proper conversion
        const TOKEN_USD_RATES: Record<string, number> = {
          'sepolia': 0.0065,          // JPYC: 1 JPYC ≈ $0.0065
          'filecoin-calibration': 1.0, // USDFC: 1 USDFC ≈ $1
        };

        if (customTokenNetworks.includes(network)) {
          // Parse USD price
          const usdPrice = typeof price === 'string' && price.startsWith('$')
            ? parseFloat(price.slice(1))
            : typeof price === 'number' ? price : parseFloat(String(price));

          // Convert USD to token amount using exchange rate
          const tokenRate = TOKEN_USD_RATES[network] || 1.0;
          const tokenAmount = usdPrice / tokenRate;

          console.log(`[x402x Middleware] USD to token conversion: $${usdPrice} → ${tokenAmount.toFixed(4)} tokens (rate: $${tokenRate})`);

          baseAmount = BigInt(Math.floor(tokenAmount * Math.pow(10, x402xConfig.defaultAsset.decimals))).toString();
          asset = {
            address: x402xConfig.defaultAsset.address,
            decimals: x402xConfig.defaultAsset.decimals,
            eip712: x402xConfig.defaultAsset.eip712,
          };
        } else {
          // Try x402's standard calculation for other networks
          try {
            const atomicAmountForAsset = processPriceToAtomicAmount(price, network);
            if ("error" in atomicAmountForAsset) {
              throw new Error(atomicAmountForAsset.error);
            }
            baseAmount = atomicAmountForAsset.maxAmountRequired;
            asset = atomicAmountForAsset.asset;
          } catch (error) {
            // Fallback to manual calculation
            const parsedPrice = typeof price === 'string' && price.startsWith('$')
              ? parseFloat(price.slice(1))
              : typeof price === 'number' ? price : parseFloat(String(price));

            baseAmount = BigInt(Math.floor(parsedPrice * Math.pow(10, x402xConfig.defaultAsset.decimals))).toString();
            asset = {
              address: x402xConfig.defaultAsset.address,
              decimals: x402xConfig.defaultAsset.decimals,
              eip712: x402xConfig.defaultAsset.eip712,
            };
          }
        }

        const resourceUrl: Resource = resource || (c.req.url as Resource);

        // Resolve hook and hookData (support function or string)
        const resolvedHook =
          typeof hook === "function" ? hook(network) : hook || TransferHook.getAddress(network);

        const resolvedHookData =
          typeof hookData === "function" ? hookData(network) : hookData || TransferHook.encode();

        // Resolve facilitatorFee (support function or value)
        // If not configured or "auto", query from facilitator dynamically
        let resolvedFacilitatorFeeRaw =
          typeof facilitatorFee === "function" ? facilitatorFee(network) : facilitatorFee;

        let resolvedFacilitatorFee: string;
        let businessAmount: string;
        let maxAmountRequired: string;

        // Check if we should dynamically query fee
        if (resolvedFacilitatorFeeRaw === undefined || resolvedFacilitatorFeeRaw === "auto") {
          // For testnets, use simple percentage-based fee (0.3% or $0.01 min)
          // This matches the facilitator's validation logic
          const isTestnet = network.includes("sepolia") || network.includes("testnet") || network.includes("calibration");
          
          if (isTestnet) {
            // Token USD rates for fee calculation
            const TOKEN_USD_RATES: Record<string, number> = {
              'sepolia': 0.0065,          // JPYC
              'filecoin-calibration': 1.0, // USDFC
            };
            
            const baseAmountBigInt = BigInt(baseAmount);
            const tokenRate = TOKEN_USD_RATES[network] || 1.0;
            const tokenDecimals = x402xConfig.defaultAsset.decimals;
            
            // Calculate 0.3% fee
            const percentFee = (baseAmountBigInt * 3n) / 1000n;
            
            // Calculate $0.01 minimum in token units
            const minFeeUsd = 0.01;
            const minFeeTokenAmount = minFeeUsd / tokenRate;
            const minFeeAtomic = BigInt(Math.floor(minFeeTokenAmount * Math.pow(10, tokenDecimals)));
            
            // Use the higher of percentage or minimum
            resolvedFacilitatorFee = (percentFee > minFeeAtomic ? percentFee : minFeeAtomic).toString();
            
            businessAmount = baseAmount;
            maxAmountRequired = (baseAmountBigInt + BigInt(resolvedFacilitatorFee)).toString();
            
            const feeUSD = (Number(resolvedFacilitatorFee) / Math.pow(10, tokenDecimals)) * tokenRate;
            
            console.log("[x402x Middleware] Testnet fee calculated (percentage-based):", {
              network,
              businessAmount,
              facilitatorFee: resolvedFacilitatorFee,
              totalAmount: maxAmountRequired,
              feeUSD: feeUSD.toFixed(6),
              feePercent: `${((Number(resolvedFacilitatorFee) / Number(baseAmount)) * 100).toFixed(2)}%`,
              method: percentFee > minFeeAtomic ? "0.3%" : "$0.01 min",
            });
          } else {
            // For mainnets, query facilitator for gas-based fee
            if (!facilitator?.url) {
              throw new Error(
                `Facilitator URL required for dynamic fee calculation. ` +
                  `Please provide facilitator config in paymentMiddleware() or set static facilitatorFee.`,
              );
            }

            try {
              const feeResult = await calculateFacilitatorFee(
                facilitator.url,
                network,
                resolvedHook,
                resolvedHookData,
              );
              resolvedFacilitatorFee = feeResult.facilitatorFee;

              // Apply fee cap if configured (default 10% of payment)
              const maxFeePercent = routeConfig.maxFeePercentage ?? 0.1;
              const maxFeeAllowed = BigInt(Math.floor(parseFloat(baseAmount) * maxFeePercent));
              const calculatedFee = BigInt(resolvedFacilitatorFee);
              
              if (calculatedFee > maxFeeAllowed && maxFeePercent < 1) {
                console.log("[x402x Middleware] Fee capped:", {
                  network,
                  originalFee: resolvedFacilitatorFee,
                  maxFeeAllowed: maxFeeAllowed.toString(),
                  maxFeePercent: `${maxFeePercent * 100}%`,
                });
                resolvedFacilitatorFee = maxFeeAllowed.toString();
              }

              // When using dynamic fee, price is business price only
              // Total = business price + facilitator fee
              businessAmount = baseAmount;
              maxAmountRequired = (
                BigInt(businessAmount) + BigInt(resolvedFacilitatorFee)
              ).toString();

              console.log("[x402x Middleware] Dynamic fee calculated:", {
                network,
                hook: resolvedHook,
                businessAmount,
                facilitatorFee: resolvedFacilitatorFee,
                totalAmount: maxAmountRequired,
                feeUSD: feeResult.facilitatorFeeUSD,
                capped: calculatedFee > maxFeeAllowed,
              });
            } catch (error) {
              console.error("[x402x Middleware] Failed to calculate dynamic fee:", error);
              throw new Error(
                `Failed to query facilitator fee: ${error instanceof Error ? error.message : "Unknown error"}`,
              );
            }
          }
        } else if (resolvedFacilitatorFeeRaw === "0" || resolvedFacilitatorFeeRaw === 0) {
          // Explicitly set to 0
          resolvedFacilitatorFee = "0";
          businessAmount = baseAmount;
          maxAmountRequired = baseAmount;
        } else {
          // Static fee configuration
          const feeResult = processPriceToAtomicAmount(resolvedFacilitatorFeeRaw, network);
          if ("error" in feeResult) {
            throw new Error(`Invalid facilitatorFee: ${feeResult.error}`);
          }
          resolvedFacilitatorFee = feeResult.maxAmountRequired;
          businessAmount = baseAmount;
          // Total = business price + static facilitator fee
          maxAmountRequired = (BigInt(businessAmount) + BigInt(resolvedFacilitatorFee)).toString();
        }

        // Build base PaymentRequirements
        const baseRequirements: PaymentRequirements = {
          scheme: "exact",
          network,
          maxAmountRequired,
          resource: resourceUrl,
          description: description || `Payment of ${maxAmountRequired} on ${network}`,
          mimeType: mimeType || "application/json",
          payTo: x402xConfig.settlementRouter as Address, // Use SettlementRouter as payTo
          maxTimeoutSeconds: maxTimeoutSeconds || 3600,
          asset: asset.address as Address,
          outputSchema: {
            input: {
              type: "http",
              method,
              discoverable: true,
            },
          },
          // DON'T include eip712 in extra - client will use correct config from @secured-finance/x402-core
          // x402's asset.eip712 has hardcoded version "2" which is incorrect for JPYC and other tokens
          extra: undefined,
        };

        // Add settlement extension with both business amount and facilitator fee
        const requirements = addSettlementExtra(baseRequirements, {
          hook: resolvedHook,
          hookData: resolvedHookData,
          facilitatorFee: resolvedFacilitatorFee,
          payTo, // Final recipient
        });

        // Add extra field to track business amount separately (optional, for transparency)
        if (resolvedFacilitatorFeeRaw === undefined || resolvedFacilitatorFeeRaw === "auto") {
          requirements.extra = {
            ...requirements.extra,
            businessAmount,
          };
        }

        paymentRequirements.push(requirements);
      }
    }

    // Check for X-PAYMENT header (payment might be undefined if decoding failed earlier)
    if (!payment || !decodedPayment) {
      // No payment, return 402
      return c.json(
        {
          error: errorMessages?.paymentRequired || "X-PAYMENT header is required",
          accepts: paymentRequirements,
          x402Version,
        },
        402,
      );
    }

    // Find matching payment requirement
    const selectedPaymentRequirements = findMatchingPaymentRequirements(
      paymentRequirements,
      decodedPayment,
    );

    if (!selectedPaymentRequirements) {
      return c.json(
        {
          error:
            errorMessages?.noMatchingRequirements || "Unable to find matching payment requirements",
          accepts: toJsonSafe(paymentRequirements),
          x402Version,
        },
        402,
      );
    }

    // Verify payment
    const verification = await verify(decodedPayment, selectedPaymentRequirements);

    if (!verification.isValid) {
      return c.json(
        {
          error: errorMessages?.verificationFailed || verification.invalidReason,
          accepts: paymentRequirements,
          payer: verification.payer,
          x402Version,
        },
        402,
      );
    }

    // Set x402 context for handler access (x402x extension)
    // Note: verification.payer is guaranteed to exist when verification.isValid is true
    if (!verification.payer) {
      throw new Error("Payer address is missing from verification result");
    }

    const x402Context: X402Context = {
      payer: verification.payer as Address | SolanaAddress,
      amount: selectedPaymentRequirements.maxAmountRequired,
      network: selectedPaymentRequirements.network,
      payment: decodedPayment,
      requirements: selectedPaymentRequirements,
      settlement: selectedPaymentRequirements.extra
        ? {
            router: selectedPaymentRequirements.payTo as Address,
            hook: (selectedPaymentRequirements.extra as any).hook as Address,
            hookData: (selectedPaymentRequirements.extra as any).hookData as string,
            facilitatorFee: (selectedPaymentRequirements.extra as any).facilitatorFee as string,
          }
        : undefined,
    };
    c.set("x402", x402Context);

    // Proceed with request (execute business logic)
    await next();

    let res = c.res;

    // If the response from the protected route is >= 400, do not settle payment
    if (res.status >= 400) {
      return;
    }

    c.res = undefined;

    // Settle payment before sending the response
    try {
      const settlement = await settle(decodedPayment, selectedPaymentRequirements);
      if (settlement.success) {
        const responseHeader = settleResponseHeader(settlement);
        res.headers.set("X-PAYMENT-RESPONSE", responseHeader);

        // Update x402 context with transaction hash (for reference)
        x402Context.transactionHash = settlement.transaction;

        // Inject transaction hash into response body if it's JSON
        try {
          const contentType = res.headers.get("Content-Type");
          if (contentType?.includes("application/json")) {
            const bodyText = await res.text();
            const bodyJson = JSON.parse(bodyText);
            bodyJson.txHash = settlement.transaction;
            res = new Response(JSON.stringify(bodyJson), {
              status: res.status,
              statusText: res.statusText,
              headers: res.headers,
            });
          }
        } catch (e) {
          // If we can't parse/modify the response body, just continue
          console.error("[x402x Middleware] Failed to inject txHash into response:", e);
        }
      } else {
        throw new Error(settlement.errorReason);
      }
    } catch (error) {
      res = c.json(
        {
          error:
            errorMessages?.settlementFailed ||
            (error instanceof Error ? error.message : "Failed to settle payment"),
          accepts: paymentRequirements,
          x402Version,
        },
        402,
      );
    }

    c.res = res;
  };
}

// Re-export types for convenience
export type {
  Money,
  Network,
  Resource,
  FacilitatorConfig,
  PaymentPayload,
  PaymentRequirements,
} from "x402/types";
export type { Address } from "viem";
export type { Address as SolanaAddress } from "@solana/kit";
