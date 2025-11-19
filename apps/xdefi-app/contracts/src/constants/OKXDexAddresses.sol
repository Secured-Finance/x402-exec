// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

/**
 * @title OKXDexAddresses
 * @notice OKX DEX aggregator contract addresses for different networks
 * @dev These addresses are used by OKXDexHook to execute swaps
 * 
 * Reference: https://www.oklink.com/zh-hans/x-layer/address/0xc259de94f6beddec5ed1c024b0283082ffa50cca
 */
library OKXDexAddresses {
    // X Layer Mainnet (Chain ID: 196)
    // Explorer: https://www.oklink.com/zh-hans/x-layer/address/0xc259de94f6beddec5ed1c024b0283082ffa50cca
    address public constant X_LAYER_MAINNET = 0xC259de94F6bedDec5Ed1C024b0283082ffa50cca;
    
    // Base Mainnet (Chain ID: 8453)
    // TBD - To be updated when Base aggregator is deployed
    address public constant BASE_MAINNET = 0x2bD541Ab3b704F7d4c9DFf79EfaDeaa85EC034f1;

    
    /**
     * @notice Get DEX aggregator address by chain ID
     * @param chainId Chain ID
     * @return aggregator DEX aggregator address, or address(0) if not supported
     */
    function getAggregatorByChainId(uint256 chainId) internal pure returns (address aggregator) {
        if (chainId == 196) {
            return X_LAYER_MAINNET;
        } else if (chainId == 8453) {
            return BASE_MAINNET;
        } else {
            return address(0);
        }
    }
}

