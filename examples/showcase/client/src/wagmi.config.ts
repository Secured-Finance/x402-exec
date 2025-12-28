/**
 * Wagmi configuration for wallet connection
 * Supports: Sepolia (JPYC), Filecoin Calibration (USDFC)
 */

import { http, createConfig } from "wagmi";
import { injected, metaMask, coinbaseWallet } from "wagmi/connectors";
import { sepolia, filecoinCalibration } from "./config";

// Configure wagmi with multiple wallet connectors and chains
export const config = createConfig({
  chains: [sepolia, filecoinCalibration],
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
    [sepolia.id]: http(),
    [filecoinCalibration.id]: http(),
  },
  // Enable multi-injected provider discovery (for multi-wallet support)
  multiInjectedProviderDiscovery: true,
});
