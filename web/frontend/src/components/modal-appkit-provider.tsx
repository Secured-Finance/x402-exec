import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { base, baseSepolia, defineChain, xLayer } from "@reown/appkit/networks";
import { createAppKit, useAppKit, useAppKitAccount } from "@reown/appkit/react";
import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

interface ModalAppKitContextType {
  isConnected: boolean;
  address: string | undefined;
  openModal: () => void;
}

const ModalAppKitContext = createContext<ModalAppKitContextType | undefined>(
  undefined,
);

interface ModalAppKitProviderProps {
  children: ReactNode;
}

export function ModalAppKitProvider({ children }: ModalAppKitProviderProps) {
  const [isAppKitCreated, setIsAppKitCreated] = useState(false);

  useEffect(() => {
    const projectId =
      import.meta.env.VITE_APPKIT_PROJECT_ID || "default-project-id";

    const xLayerTestnet = defineChain({
      id: 1952,
      caipNetworkId: "eip155:1952",
      chainNamespace: "eip155",
      name: "X Layer Testnet",
      nativeCurrency: {
        decimals: 18,
        name: "OKB",
        symbol: "OKB",
      },
      blockExplorers: {
        default: { name: "OKLink", url: "https://www.oklink.com/xlayer-test" },
      },
      rpcUrls: {
        default: { http: ["https://testrpc.xlayer.tech/terigon"] },
      },
    });

    const networks = [base, baseSepolia, xLayer, xLayerTestnet];

    createAppKit({
      adapters: [
        new WagmiAdapter({
          projectId,
          networks: networks,
        }),
      ],
      networks: networks as any,
      metadata: {
        name: "X402 Facilitator",
        description: "X402 Payment Facilitator",
        url: "https://x402x.dev",
        icons: ["https://x402x.dev/icon.png"],
      },
      projectId,
      features: {
        analytics: false,
        emailShowWallets: false,
      },
    });

    setIsAppKitCreated(true);
  }, []);

  if (!isAppKitCreated) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return <ModalAppKitProviderInner>{children}</ModalAppKitProviderInner>;
}

function ModalAppKitProviderInner({ children }: { children: ReactNode }) {
  const { open: openModal } = useAppKit();
  const { isConnected, address } = useAppKitAccount();

  const contextValue: ModalAppKitContextType = {
    isConnected,
    address,
    openModal,
  };

  return (
    <ModalAppKitContext.Provider value={contextValue}>
      {children}
    </ModalAppKitContext.Provider>
  );
}

export function useModalAppKit() {
  const context = useContext(ModalAppKitContext);
  if (context === undefined) {
    throw new Error("useModalAppKit must be used within a ModalAppKitProvider");
  }
  return context;
}
