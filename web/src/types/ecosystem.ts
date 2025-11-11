import type { EcosystemTagId } from "@/constants/ecosystem/tags";

export type EcosystemProjectMetadata = {
  name: string;
  description: string;
  url: string;
  paymentTokensByNetwork: Record<string, string[]>;
  // Deprecated: networks are derived from keys of paymentTokensByNetwork
  networks?: string[];
  // Project tag id, must be one of ECOSYSTEM_TAGS ids
  tag: EcosystemTagId;
};

export type EcosystemProject = EcosystemProjectMetadata & {
  slug: string;
  logoSrc: string;
  illustrationSrc: string;
  // Required in the computed project object
  networks: string[];
};
