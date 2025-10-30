# NFT Mint Scenario

This scenario demonstrates automatic NFT minting upon payment completion.

## Contracts

### `NFTMintHook.sol`
**Purpose**: Automatically mint NFT to payer after payment is processed

**Flow**:
1. User pays for NFT
2. Payment is transferred to merchant
3. NFT is automatically minted to user's address

**Configuration**:
```solidity
struct MintConfig {
    address nftContract;  // NFT contract address
    uint256 tokenId;      // Token ID to mint
    address recipient;    // Usually the payer
    address merchant;     // Merchant receiving payment
}
```

### `NFTMintAndSplitHook.sol`
**Purpose**: Combined NFT minting + revenue splitting (e.g., marketplace with commission)

**Flow**:
1. User pays for NFT
2. Payment is split between merchant and platform
3. NFT is minted to user's address

**Configuration**:
```solidity
struct MintAndSplit {
    address nftContract;
    uint256 tokenId;
    address merchant;
    uint16 merchantBips;  // Merchant's share (basis points)
    address platform;
    uint16 platformBips;  // Platform's share (basis points)
}
```

### `RandomNFT.sol`
**Purpose**: Example NFT contract with sequential token ID generation

**Features**:
- Maximum supply of 1000 NFTs
- Sequential token IDs (0-999)
- Only designated minter can mint
- One-time minter setup for security

## Deployment Example

```solidity
// 1. Deploy NFT contract
RandomNFT nft = new RandomNFT();

// 2. Deploy Hook
NFTMintHook hook = new NFTMintHook(settlementHub);

// 3. Set Hook as NFT minter
nft.setMinter(address(hook));

// 4. Configure hookData for each sale
bytes memory hookData = abi.encode(MintConfig({
    nftContract: address(nft),
    tokenId: nextTokenId,
    recipient: payer,
    merchant: merchantAddress
}));
```

## Use Cases

- **NFT Marketplaces**: Automatic fulfillment of NFT purchases
- **Digital Collectibles**: Mint-on-demand collectibles
- **Event Tickets**: NFT-based event tickets
- **Membership Cards**: NFT membership tokens
- **Gaming Assets**: In-game item NFTs

## Integration Notes

- Each application should deploy its own NFT contract and Hook instance
- The NFT contract must authorize the Hook as a minter
- Token IDs can be pre-determined or generated dynamically
- Consider gas costs for complex NFT minting logic
