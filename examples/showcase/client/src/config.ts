/**
 * Client configuration
 * Manages environment variables and runtime configuration
 *
 * This config maximizes reuse of x402 protocol definitions:
 * - Chain definitions from x402/types (xLayerTestnet, etc.)
 * - USDC addresses from x402 evm.config
 * - Explorer URLs from chain.blockExplorers
 *
 * Only UI-specific fields (icon, displayName, faucetUrl) are defined locally.
 */

import { Chain } from "viem";
import { sepolia } from "viem/chains";
import { evm } from "x402/types";

// Re-export chains from evm namespace
const { xLayerTestnet, xLayer, skaleBaseSepolia } = evm;

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
      url: "https://filecoin.blockscout.com",
    },
  },
  testnet: true,
};

/**
 * Supported network identifiers
 */
export type Network = "base-sepolia" | "x-layer-testnet" | "skale-base-sepolia" | "base" | "x-layer" | "sepolia" | "filecoin-calibration";

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
  usdcAddress: string;
  decimals: number; // Token decimals (6 for USDC, 18 for JPYC/USDFC)
}

/**
 * UI configuration for supported networks
 * Only contains presentation-layer fields
 */
export const NETWORK_UI_CONFIG: Record<string, NetworkUIConfig> = {
  "base-sepolia": {
    icon: "🔵",
    displayName: "Base Sepolia",
    faucetUrl: "https://faucet.circle.com/",
  },
  "x-layer-testnet": {
    icon: "⭕",
    displayName: "X Layer Testnet",
    faucetUrl: "https://www.okx.com/xlayer/faucet",
  },
  "skale-base-sepolia": {
    icon: "💎",
    displayName: "SKALE Base Sepolia",
    faucetUrl: "https://base-sepolia-faucet.skale.space",
  },
  base: {
    icon: "🔵",
    displayName: "Base Mainnet",
    faucetUrl: "https://docs.base.org/docs/tools/bridge-funds/",
  },
  "x-layer": {
    icon: "⭕",
    displayName: "X Layer",
    faucetUrl: "https://www.okx.com/xlayer/bridge",
  },
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
 * Get complete network configuration by combining x402 data with UI config
 * @param network Network identifier
 * @returns Complete network configuration
 */
export function getNetworkConfig(network: Network): NetworkConfig {
  const uiConfig = NETWORK_UI_CONFIG[network];

  // Handle custom networks that aren't in x402 package
  if (network === "sepolia") {
    return {
      chainId: sepolia.id,
      name: network,
      chain: sepolia,
      displayName: uiConfig.displayName,
      icon: uiConfig.icon,
      faucetUrl: uiConfig.faucetUrl,
      usdcAddress: "0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29", // JPYC address
      explorerUrl: sepolia.blockExplorers?.default.url || "",
      decimals: 18, // JPYC has 18 decimals
    };
  }

  if (network === "filecoin-calibration") {
    return {
      chainId: filecoinCalibration.id,
      name: network,
      chain: filecoinCalibration,
      displayName: uiConfig.displayName,
      icon: uiConfig.icon,
      faucetUrl: uiConfig.faucetUrl,
      usdcAddress: "0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0", // USDFC address
      explorerUrl: filecoinCalibration.blockExplorers?.default.url || "",
      decimals: 18, // USDFC has 18 decimals
    };
  }

  // Handle standard x402 networks
  const chain = evm.getChainFromNetwork(network) as Chain;
  const chainConfig = evm.config[chain.id.toString()];

  if (!chainConfig) {
    throw new Error(`No chain config found for network: ${network} (chain ID: ${chain.id})`);
  }

  return {
    chainId: chain.id,
    name: network,
    chain,
    usdcAddress: chainConfig.usdcAddress as string,
    explorerUrl: chain.blockExplorers?.default.url || "",
    decimals: 6, // Standard x402 networks use USDC with 6 decimals
    ...uiConfig,
  };
}

/**
 * All supported networks configurations
 * Data sourced from x402, only UI fields are local
 */
export const NETWORKS: Record<Network, NetworkConfig> = {
  "base-sepolia": getNetworkConfig("base-sepolia"),
  "x-layer-testnet": getNetworkConfig("x-layer-testnet"),
  "skale-base-sepolia": getNetworkConfig("skale-base-sepolia"),
  base: getNetworkConfig("base"),
  "x-layer": getNetworkConfig("x-layer"),
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
    return "https://facilitator.x402x.dev";
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


// Re-export chains for wagmi config
export { xLayerTestnet, xLayer, skaleBaseSepolia, sepolia, filecoinCalibration };
