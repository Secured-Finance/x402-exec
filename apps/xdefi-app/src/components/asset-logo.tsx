import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import React, { useEffect, useMemo, useState } from "react";

type Props = {
  kind: "network" | "token";
  id: string; // network key (e.g., 'base') or token symbol (e.g., 'USDC')
  size?: number; // square size in px
  className?: string;
  title?: string;
  // Optional absolute URL for a token logo (e.g., OKX tokenLogoUrl). If provided,
  // we try this first and fall back to local static assets if it fails.
  src?: string;
};

// Simple logo resolver that maps keys to files under /public/logos
// Supports both .svg and .png (tries .svg first, then .png)
// - Networks: /public/logos/networks/<network>.{svg|png}
// - Tokens:   /public/logos/tokens/<symbol>.{svg|png} (token path uses lowercase symbol)
//
// Note: The actual files can be added later; this component will gracefully
//       fallback to an initial-based badge when the image is missing.
export function AssetLogo({ kind, id, size = 20, className, title, src }: Props) {
  // Build a base path without extension and try svg -> png.
  const base = useMemo(() => {
    // Respect Vite's base path so assets resolve in GH Pages or subpath deployments
    const root = (import.meta as any)?.env?.BASE_URL ?? "/";
    if (kind === "network") return `${root}logos/networks/${id}`;
    return `${root}logos/tokens/${id.toLowerCase()}`; // token: normalize to lowercase symbol
  }, [kind, id]);

  // Try .svg first, then .png if it fails. If both fail, fall back to gradient.
  const [ext, setExt] = useState<"svg" | "png" | null>("svg");
  // When a remote `src` is supplied, try it first; on error, fall back to local assets
  const [useRemote, setUseRemote] = useState<boolean>(!!src);
  // biome-ignore lint/correctness/useExhaustiveDependencies: <>
  useEffect(() => {
    setUseRemote(!!src);
  }, [src]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: <>
  useEffect(() => {
    // Reset the attempt chain whenever target changes
    setExt("svg");
  }, [base]);

  // Deterministic "random" gradient based on the id so it stays stable between renders
  const gradient = React.useMemo(() => {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    const hue1 = (h >>> 0) % 360;
    const hue2 = (hue1 + 90 + ((h >>> 5) % 90)) % 360;
    const c1 = `hsl(${hue1} 70% 50%)`;
    const c2 = `hsl(${hue2} 70% 50%)`;
    return `linear-gradient(135deg, ${c1}, ${c2})`;
  }, [id]);

  return (
    <Avatar
      className={`${className} rounded-xs`}
      title={title || id}
      style={{ width: size, height: size }}
    >
      {useRemote ? (
        <AvatarImage
          src={src}
          alt={title || id}
          // If remote fails, switch to local asset chain (svg -> png -> gradient)
          onLoadingStatusChange={(status) => {
            if (status === "error") {
              setUseRemote(false);
              setExt("svg");
            }
          }}
        />
      ) : (
        ext && (
          <AvatarImage
            src={`${base}.${ext}`}
            alt={title || id}
            onLoadingStatusChange={(status) => {
              if (status === "error") {
                setExt((prev) => (prev === "svg" ? "png" : null));
              }
            }}
          />
        )
      )}
      <AvatarFallback aria-label={title || id}>
        <span
          aria-hidden
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            background: gradient,
          }}
        />
      </AvatarFallback>
    </Avatar>
  );
}

export default AssetLogo;
