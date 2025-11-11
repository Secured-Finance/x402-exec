// Central list of allowed ecosystem tags.
export const ECOSYSTEM_TAGS = [
  { id: "commerce", label: "Commerce" },
  { id: "wallet", label: "Wallet" },
  { id: "template", label: "Template" },
  { id: "demo", label: "Demo" },
  { id: "sdk", label: "SDK" },
  { id: "tooling", label: "Tooling" },
  // Add more as needed; keep ids kebab/lowercase
] as const;

export type EcosystemTagId = (typeof ECOSYSTEM_TAGS)[number]["id"];

export const ECOSYSTEM_TAG_LABEL: Record<EcosystemTagId, string> = Object.fromEntries(
  ECOSYSTEM_TAGS.map((t) => [t.id, t.label]),
) as Record<EcosystemTagId, string>;

