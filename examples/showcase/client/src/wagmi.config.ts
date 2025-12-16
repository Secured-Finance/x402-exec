/**
 * Wagmi configuration for wallet connection
 * Supports multiple networks: Base Sepolia, X-Layer Testnet, SKALE Base Sepolia, Base Mainnet, X-Layer Mainnet, Sepolia, Filecoin Calibration
 */

import { http, createConfig } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { injected, metaMask, coinbaseWallet } from "wagmi/connectors";
import { xLayerTestnet, xLayer, skaleBaseSepolia, sepolia, filecoinCalibration } from "./config";

// Configure wagmi with multiple wallet connectors and chains
export const config = createConfig({
  chains: [baseSepolia, xLayerTestnet, skaleBaseSepolia, base, xLayer, sepolia, filecoinCalibration],
  connectors: [
    // Explicitly target specific wallets to avoid conflicts
    metaMask(),
    coinbaseWallet({
      appName: "x402x Protocol Demo",
    }),
    // Fallback to generic injected for other wallets
    injected(),
  ],
  transports: {
    [baseSepolia.id]: http(),
    [xLayerTestnet.id]: http(),
    [skaleBaseSepolia.id]: http(),
    [base.id]: http(),
    [xLayer.id]: http(),
    [sepolia.id]: http(),
    [filecoinCalibration.id]: http(),
  },
  // Enable multi-injected provider discovery (for multi-wallet support)
  multiInjectedProviderDiscovery: true,
});
