// Central list of allowed ecosystem tags.
export const ECOSYSTEM_TAGS = [
	{ id: "ai", label: "AI" },
	{ id: "wallet", label: "Wallet" },
	{ id: "demo", label: "Demo" },
	{ id: "defi", label: "DeFi" },
	// Add more as needed; keep ids kebab/lowercase
] as const;

export type EcosystemTagId = (typeof ECOSYSTEM_TAGS)[number]["id"];

export const ECOSYSTEM_TAG_LABEL: Record<EcosystemTagId, string> =
	Object.fromEntries(ECOSYSTEM_TAGS.map((t) => [t.id, t.label])) as Record<
		EcosystemTagId,
		string
	>;
