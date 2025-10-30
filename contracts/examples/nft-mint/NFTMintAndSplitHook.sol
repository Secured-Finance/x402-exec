// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {ISettlementHook} from "../../src/interfaces/ISettlementHook.sol";

/**
 * @title NFTMintAndSplitHook
 * @notice NFT Mint + Revenue Split Hook - Combined example
 * @dev Complete NFT minting and revenue splitting simultaneously
 * 
 * Use cases:
 *   - NFT marketplace trades (platform commission)
 *   - Creator NFT sales (platform + creator split)
 *   - Joint NFT issuance
 */
contract NFTMintAndSplitHook is ISettlementHook {
    using SafeERC20 for IERC20;
    
    // ===== State Variables =====
    
    /// @notice SettlementHub contract address
    address public immutable settlementHub;
    
    // ===== Data Structures =====
    
    /**
     * @notice NFT mint + revenue split configuration
     * @param nftContract NFT contract address
     * @param tokenId Token ID
     * @param merchant Merchant address
     * @param merchantBips Merchant split ratio (basis points)
     * @param platform Platform address
     * @param platformBips Platform split ratio (basis points)
     */
    struct MintAndSplit {
        address nftContract;
        uint256 tokenId;
        address merchant;
        uint16 merchantBips;
        address platform;
        uint16 platformBips;
    }
    
    // ===== Events =====
    
    event NFTMinted(
        bytes32 indexed contextKey,
        address indexed nftContract,
        uint256 indexed tokenId,
        address recipient
    );
    
    event RevenueSplit(
        bytes32 indexed contextKey,
        address indexed recipient,
        uint256 amount
    );
    
    // ===== Error Definitions =====
    
    error OnlyHub();
    error InvalidTotalBips(uint256 totalBips);
    error InvalidAddress();
    
    // ===== Modifiers =====
    
    modifier onlyHub() {
        if (msg.sender != settlementHub) {
            revert OnlyHub();
        }
        _;
    }
    
    // ===== Constructor =====
    
    constructor(address _settlementHub) {
        require(_settlementHub != address(0), "Invalid hub address");
        settlementHub = _settlementHub;
    }
    
    // ===== Core Functions =====
    
    /**
     * @inheritdoc ISettlementHook
     * @dev hookData format: abi.encode(MintAndSplit)
     */
    function execute(
        bytes32 contextKey,
        address payer,
        address token,
        uint256 amount,
        bytes calldata data
    ) external onlyHub returns (bytes memory) {
        // Decode configuration
        MintAndSplit memory params = abi.decode(data, (MintAndSplit));
        
        // Validate addresses
        if (params.nftContract == address(0) || 
            params.merchant == address(0) || 
            params.platform == address(0)) {
            revert InvalidAddress();
        }
        
        // Validate split ratios
        if (params.merchantBips + params.platformBips != 10000) {
            revert InvalidTotalBips(params.merchantBips + params.platformBips);
        }
        
        // 1. Mint NFT to payer
        _safeMint(params.nftContract, payer, params.tokenId);
        emit NFTMinted(contextKey, params.nftContract, params.tokenId, payer);
        
        // 2. Split revenue to merchant
        uint256 merchantAmount = (amount * params.merchantBips) / 10000;
        IERC20(token).safeTransferFrom(
            settlementHub,
            params.merchant,
            merchantAmount
        );
        emit RevenueSplit(contextKey, params.merchant, merchantAmount);
        
        // 3. Split revenue to platform (remaining amount, avoids precision errors)
        uint256 platformAmount = amount - merchantAmount;
        IERC20(token).safeTransferFrom(
            settlementHub,
            params.platform,
            platformAmount
        );
        emit RevenueSplit(contextKey, params.platform, platformAmount);
        
        // Return tokenId
        return abi.encode(params.tokenId);
    }
    
    // ===== Internal Methods =====
    
    /**
     * @notice Safely mint NFT
     * @dev Use low-level call to be compatible with different NFT contracts
     */
    function _safeMint(address nftContract, address to, uint256 tokenId) internal {
        (bool success, ) = nftContract.call(
            abi.encodeWithSignature("mint(address,uint256)", to, tokenId)
        );
        require(success, "NFT mint failed");
    }
}

