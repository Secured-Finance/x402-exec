/**
 * Client configuration
 * Manages environment variables and runtime configuration
 *
 * Currently supports:
 * - Sepolia (JPYC token with 18 decimals)
 * - Filecoin Calibration (USDFC token with 18 decimals)
 *
 * Only UI-specific fields (icon, displayName, faucetUrl) are defined locally.
 */

import { Chain } from "viem";
import { sepolia } from "viem/chains";

// Define Filecoin Calibration chain (not in viem/chains)
const filecoinCalibration: Chain = {
  id: 314159,
  name: "Filecoin Calibration",
  nativeCurrency: {
    decimals: 18,
    name: "Filecoin",
    symbol: "FIL",
  },
  rpcUrls: {
    default: {
      http: ["https://api.calibration.node.glif.io/rpc/v1"],
    },
  },
  blockExplorers: {
    default: {
      name: "Filecoin Calibration Explorer",
      url: "https://filecoin-testnet.blockscout.com",
    },
  },
  testnet: true,
};

/**
 * Supported network identifiers
 * Currently only Sepolia (JPYC) and Filecoin Calibration (USDFC) are enabled
 */
export type Network = "sepolia" | "filecoin-calibration";

/**
 * UI-specific network configuration
 * Only contains presentation fields not available in x402
 */
export interface NetworkUIConfig {
  icon: string;
  displayName: string;
  faucetUrl: string;
}

/**
 * Complete network configuration
 * Combines x402 protocol data with UI metadata
 */
export interface NetworkConfig {
  chainId: number;
  name: string;
  displayName: string;
  chain: Chain;
  icon: string;
  faucetUrl: string;
  explorerUrl: string;
  tokenAddress: string; // Token contract address (USDC, JPYC, USDFC)
  tokenSymbol: string; // Token symbol (USDC, JPYC, USDFC)
  decimals: number; // Token decimals (6 for USDC, 18 for JPYC/USDFC)
}

/**
 * UI configuration for supported networks
 * Only contains presentation-layer fields
 */
export const NETWORK_UI_CONFIG: Record<string, NetworkUIConfig> = {
  "sepolia": {
    icon: "💴",
    displayName: "Sepolia (JPYC)",
    faucetUrl: "https://sepoliafaucet.com/",
  },
  "filecoin-calibration": {
    icon: "🎞️",
    displayName: "Filecoin Calibration (USDFC)",
    faucetUrl: "https://faucet.calibration.fildev.network/",
  }
};

/**
 * Get complete network configuration by combining chain data with UI config
 * @param network Network identifier
 * @returns Complete network configuration
 */
export function getNetworkConfig(network: Network): NetworkConfig {
  const uiConfig = NETWORK_UI_CONFIG[network];

  if (network === "sepolia") {
    return {
      chainId: sepolia.id,
      name: network,
      chain: sepolia,
      displayName: uiConfig.displayName,
      icon: uiConfig.icon,
      faucetUrl: uiConfig.faucetUrl,
      tokenAddress: "0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29", // JPYC address
      tokenSymbol: "JPYC",
      explorerUrl: sepolia.blockExplorers?.default.url || "",
      decimals: 18, // JPYC has 18 decimals
    };
  }

  // filecoin-calibration
  return {
    chainId: filecoinCalibration.id,
    name: network,
    chain: filecoinCalibration,
    displayName: uiConfig.displayName,
    icon: uiConfig.icon,
    faucetUrl: uiConfig.faucetUrl,
    tokenAddress: "0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0", // USDFC address
    tokenSymbol: "USDFC",
    explorerUrl: filecoinCalibration.blockExplorers?.default.url || "",
    decimals: 18, // USDFC has 18 decimals
  };
}

/**
 * All supported networks configurations
 * Currently only Sepolia (JPYC) and Filecoin Calibration (USDFC) are enabled
 */
export const NETWORKS: Record<Network, NetworkConfig> = {
  "sepolia": getNetworkConfig("sepolia"),
  "filecoin-calibration": getNetworkConfig("filecoin-calibration"),
};

/**
 * Get network config by chain ID
 */
export function getNetworkByChainId(chainId: number): Network | undefined {
  return Object.entries(NETWORKS).find(([_, config]) => config.chainId === chainId)?.[0] as
    | Network
    | undefined;
}

/**
 * LocalStorage key for storing user's preferred network
 */
export const PREFERRED_NETWORK_KEY = "x402-preferred-network";

/**
 * Get user's preferred network from localStorage
 */
export function getPreferredNetwork(): Network | null {
  const stored = localStorage.getItem(PREFERRED_NETWORK_KEY);
  if (stored && stored in NETWORKS) {
    return stored as Network;
  }
  return null;
}

/**
 * Save user's preferred network to localStorage
 */
export function setPreferredNetwork(network: Network): void {
  localStorage.setItem(PREFERRED_NETWORK_KEY, network);
}

/**
 * Get the facilitator URL
 * In development: can use local facilitator via VITE_FACILITATOR_URL
 * In production: uses VITE_FACILITATOR_URL environment variable or default
 *
 * @returns Facilitator URL
 */
export function getFacilitatorUrl(): string {
  const facilitatorUrl = import.meta.env.VITE_FACILITATOR_URL;

  // If no facilitator URL is set (undefined or empty string), use default
  if (!facilitatorUrl || facilitatorUrl.trim() === "") {
    return "https://x402-facilitator-production-57a2.up.railway.app";
  }

  // Remove trailing slash if present
  return facilitatorUrl.trim().replace(/\/$/, "");
}

/**
 * Get the API base URL
 * In development: uses empty string to leverage Vite proxy
 * In production: uses VITE_SERVER_URL environment variable
 */
export function getServerUrl(): string {
  const serverUrl = import.meta.env.VITE_SERVER_URL;

  // If no server URL is set (undefined or empty string), use relative paths (Vite proxy in dev, or same-origin in production)
  if (!serverUrl || serverUrl.trim() === "") {
    return "";
  }

  // Remove trailing slash if present
  return serverUrl.trim().replace(/\/$/, "");
}

/**
 * Build API endpoint URL
 * @param path - API path (e.g., '/api/health' or 'api/health') or full URL (e.g., 'http://localhost:3001/api/health')
 * @returns Full URL or relative path
 */
export function buildApiUrl(path: string): string {
  // If path is already a full URL, return it as-is
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const serverUrl = getServerUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return serverUrl ? `${serverUrl}${normalizedPath}` : normalizedPath;
}

// Export configuration object for convenience
export const config = {
  facilitatorUrl: getFacilitatorUrl(),
  serverUrl: getServerUrl(),
  buildApiUrl,
  networks: NETWORKS,
};

/**
 * Format an atomic amount to a human-readable string
 * Uses string manipulation to avoid JavaScript floating-point precision issues with large numbers
 * 
 * @param atomicAmount - Amount in smallest unit (e.g., "100000000000000000" for 0.1 with 18 decimals)
 * @param decimals - Number of decimal places (e.g., 18 for JPYC/USDFC, 6 for USDC)
 * @param displayDecimals - Number of decimal places to show (default: 2)
 * @returns Formatted string (e.g., "1.00")
 */
export function formatAtomicAmount(
  atomicAmount: string | undefined,
  decimals: number,
  displayDecimals: number = 2
): string {
  if (!atomicAmount || atomicAmount === "0") {
    return "0." + "0".repeat(displayDecimals);
  }

  // Pad the string with leading zeros if needed
  const paddedAmount = atomicAmount.padStart(decimals + 1, "0");
  
  // Split into integer and fractional parts
  const integerPart = paddedAmount.slice(0, -decimals) || "0";
  const fractionalPart = paddedAmount.slice(-decimals);
  
  // Combine and format to display decimals
  const fullNumber = integerPart + "." + fractionalPart;
  const parsed = parseFloat(fullNumber);
  
  return parsed.toFixed(displayDecimals);
}

// Re-export chains for wagmi config
export { sepolia, filecoinCalibration };
