// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {OKXDexHook} from "../src/hooks/OKXDexHook.sol";

/**
 * @title DeployOKXDexHook
 * @notice Deployment script for OKXDexHook contract
 * 
 * This script deploys the OKX DEX hook, which enables token swaps during
 * payment settlement using OKX DEX aggregator.
 * 
 * Prerequisites:
 *   - SettlementRouter must be deployed first
 * 
 * Usage:
 *   forge script script/DeployOKXDexHook.s.sol:DeployOKXDexHook \
 *     --sig "run(address)" <SETTLEMENT_ROUTER_ADDRESS> \
 *     --rpc-url $RPC_URL \
 *     --broadcast \
 *     --verify
 * 
 * Required environment variables:
 *   - RPC_URL: Network RPC endpoint
 *   - DEPLOYER_PRIVATE_KEY: Deployer private key
 *   - ETHERSCAN_API_KEY: (optional) For contract verification
 */
contract DeployOKXDexHook is Script {
    function run(address settlementRouter) external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        
        console.log("Deploying OKXDexHook...");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Network Chain ID:", block.chainid);
        console.log("SettlementRouter:", settlementRouter);
        console.log("");
        
        // Validate SettlementRouter address
        require(settlementRouter != address(0), "SettlementRouter address is zero");
        require(settlementRouter.code.length > 0, "SettlementRouter not deployed at address");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy OKXDexHook
        OKXDexHook okxDexHook = new OKXDexHook(settlementRouter);
        
        vm.stopBroadcast();
        
        // Output deployment information
        console.log("=== Deployment Complete ===");
        console.log("OKXDexHook:", address(okxDexHook));
        console.log("");
        console.log("Verification:");
        console.log("  SettlementRouter:", okxDexHook.settlementRouter());
        console.log("");
        console.log("Next steps:");
        console.log("1. Update documentation with OKXDexHook address");
        console.log("2. Configure Resource Servers to use this hook for token swaps");
        console.log("3. Test with OKX DEX API integration");
        console.log("4. Verify contract on block explorer");
    }
}

