// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {SettlementHub} from "../src/SettlementHub.sol";
import {RevenueSplitHook} from "../examples/revenue-split/RevenueSplitHook.sol";
import {NFTMintHook} from "../examples/nft-mint/NFTMintHook.sol";
import {NFTMintAndSplitHook} from "../examples/nft-mint/NFTMintAndSplitHook.sol";

/**
 * @title DeploySettlement
 * @notice Deployment script: SettlementHub and example Hooks
 */
contract DeploySettlement is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy SettlementHub
        SettlementHub hub = new SettlementHub();
        console.log("SettlementHub deployed at:", address(hub));
        
        // 2. Deploy example Hooks
        RevenueSplitHook splitHook = new RevenueSplitHook(address(hub));
        console.log("RevenueSplitHook deployed at:", address(splitHook));
        
        NFTMintHook mintHook = new NFTMintHook(address(hub));
        console.log("NFTMintHook deployed at:", address(mintHook));
        
        NFTMintAndSplitHook combinedHook = new NFTMintAndSplitHook(address(hub));
        console.log("NFTMintAndSplitHook deployed at:", address(combinedHook));
        
        vm.stopBroadcast();
        
        // Output deployment information
        console.log("\n=== Deployment Summary ===");
        console.log("Network:", block.chainid);
        console.log("SettlementHub:", address(hub));
        console.log("RevenueSplitHook:", address(splitHook));
        console.log("NFTMintHook:", address(mintHook));
        console.log("NFTMintAndSplitHook:", address(combinedHook));
    }
}

