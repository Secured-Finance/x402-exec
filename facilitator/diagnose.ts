
import { loadConfig } from "./src/config.js";
import { createPoolManager } from "./src/pool-manager.js";
import { getLogger } from "./src/telemetry.js";
import dotenv from "dotenv";

dotenv.config();

const logger = getLogger();

async function diagnose() {
    console.log("Starting diagnosis...");

    try {
        console.log("Loading config...");
        const config = loadConfig();

        console.log("Loaded EVM Networks:", config.network.evmNetworks);
        console.log("EVM Private Keys found:", config.evmPrivateKeys.length);
        console.log("RPC URLs:", config.dynamicGasPrice.rpcUrls);

        if (!config.network.evmNetworks.includes("sepolia")) {
            console.error("ERROR: 'sepolia' is NOT in the configured EVM networks list!");
            return;
        }

        console.log("Attempting to create PoolManager...");
        try {
            const poolManager = await createPoolManager(
                config.evmPrivateKeys,
                config.network,
                config.accountPool,
                config.dynamicGasPrice.rpcUrls
            );

            const sepoliaPool = poolManager.getPool("sepolia");
            if (sepoliaPool) {
                console.log("SUCCESS: Sepolia pool created successfully!");
                console.log("Accounts:", sepoliaPool.getAccountsInfo().map(a => a.address));
            } else {
                console.error("FAILURE: PoolManager initialized but 'sepolia' pool is missing.");
                console.error("This usually means AccountPool.create failed and swallowed the error.");
            }

        } catch (err) {
            console.error("CRITICAL: PoolManager creation failed:", err);
        }

    } catch (error) {
        console.error("Config loading failed:", error);
    }
}

diagnose();
