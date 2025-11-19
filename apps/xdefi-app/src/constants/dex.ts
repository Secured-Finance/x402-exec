// Per-network configuration for DEX integration used by the OKX Dex Hook.
// Fill these values with your deployed addresses.
//
// - DEX_AGGREGATOR_BY_NETWORK: The OKX Aggregator/Router contract the hook will call.
// - DEX_HOOK_BY_NETWORK: The on-chain Dex Hook that executes the aggregator call during settlement.

export const DEX_AGGREGATOR_BY_NETWORK: Record<
	string,
	`0x${string}` | undefined
> = {
	// Example placeholders (replace with real addresses)
	// 'base': '0x...',
	// 'x-layer': '0x...',
	base: "0x2bD541Ab3b704F7d4c9DFf79EfaDeaa85EC034f1",
	"x-layer": "0xC259de94F6bedDec5Ed1C024b0283082ffa50cca",
};

export const DEX_HOOK_BY_NETWORK: Record<string, `0x${string}` | undefined> = {
	// Example placeholders (replace with your Dex Hook addresses)
	// 'base': '0x...',
	// 'x-layer': '0x...',
	base: "0x7A9d1F41DFE2F83b718577C899E441112516f1F2",
	"x-layer": "0x3A278270787c18Cd3595D6eD90567d7D709c2cEf",
};
