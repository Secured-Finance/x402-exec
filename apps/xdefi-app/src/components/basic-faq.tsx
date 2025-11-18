import { motion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { FiChevronDown } from "react-icons/fi";

// Simple FAQ component without external measuring deps
export default function BasicFAQ() {
  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <h3 className="mb-6 text-center text-2xl font-semibold text-foreground">
          Frequently asked questions
        </h3>

        <Question title="How are swaps gas-free and approval-free?" defaultOpen>
          <p>
            The app leverages the x402x protocol to settle trades using a signed USDC payment
            authorization instead of on-chain token approvals. A facilitator submits the
            transaction on your behalf and covers the network gas, so you only sign once in your
            wallet-no ERC-20 approvals and no native gas required. Your USDC is used to pay for
            the swap.
          </p>
        </Question>

        <Question title="What is the facilitator fee?">
          <p>
            The facilitator charges a small fee for settling your transaction on-chain. This fee
            covers gas and the service of relaying the transaction. It is separate from DEX pricing
            and is denominated in USDC. The exact amount can vary by network and market conditions.
          </p>
        </Question>

        <Question title="Where do swap prices and routes come from?">
          <p>
            Swaps are executed via the OKX Web3 DEX Aggregator. The app requests quotes and builds
            executable calldata through the OKX DEX API; the resulting trade is then settled on-chain
            by the facilitator using the selected route.
          </p>
        </Question>
      </div>
    </div>
  );
}

function Question({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  // Measure content height to animate between 0 and scrollHeight
  const measure = () => {
    const el = contentRef.current;
    if (el) setHeight(el.scrollHeight);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: <>
  useLayoutEffect(() => {
    measure();
  }, [open]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <>
  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return (
    <motion.div
      animate={open ? "open" : "closed"}
      className="border-b border-border"
    >
      <button
        type="button"
        onClick={() => setOpen((pv) => !pv)}
        className="flex w-full items-center justify-between gap-4 py-4"
      >
        {/* Title uses gradient text that works in both light/dark */}
        <span
          className="bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent text-left text-base font-medium"
        >
          {title}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          className={open ? 'text-violet-600 dark:text-violet-400' : 'text-foreground'}
        >
          <FiChevronDown className="text-xl" />
        </motion.span>
      </button>

      <motion.div
        initial={false}
        animate={{ height: open ? height : 0, marginBottom: open ? 20 : 0 }}
        className="overflow-hidden text-muted-foreground"
      >
        <div ref={contentRef} className="pb-2">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}
