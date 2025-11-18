import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { base, xLayer } from "@reown/appkit/networks";
import { AppKitProvider } from "@reown/appkit/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type PropsWithChildren, useMemo } from "react";
import { WagmiProvider } from "wagmi";

// Initialize AppKit + Wagmi adapter
const appKitProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as
  | string
  | undefined;
if (!appKitProjectId) {
  // eslint-disable-next-line no-console
  console.warn(
    "Missing VITE_WALLETCONNECT_PROJECT_ID. Wallet connect will not work until it is set.",
  );
}

const appNetworks = [base, xLayer] as unknown as [any, ...any[]];
const wagmiAdapter = new WagmiAdapter({
  networks: appNetworks,
  projectId: appKitProjectId ?? "demo",
});

const queryClient = new QueryClient();

export function Web3Provider({ children }: PropsWithChildren) {
  const qc = useMemo(() => queryClient, []);
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <AppKitProvider
        projectId={appKitProjectId ?? "demo"}
        adapters={[wagmiAdapter] as any}
        networks={appNetworks as any}
        defaultNetwork={base as any}
        metadata={{
          name: "xdefi.app",
          description: "xdefi.app — Swap & Bridge",
          url: "https://xdefi.app",
          icons: ["https://avatars.githubusercontent.com/u/13698671?s=200&v=4"],
        }}
        features={{
          analytics: false,
          emailShowWallets: false,
          swaps: false,
        }}
      >
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      </AppKitProvider>
    </WagmiProvider>
  );
}
