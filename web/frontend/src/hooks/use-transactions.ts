import * as React from "react";
import type {
  HookInfo,
  NetworkId,
  Transaction,
  TransactionsQuery,
  TransactionsResult,
} from "@/types/scan";

// Mock hook registry map for friendly names
export const MOCK_HOOKS: Record<string, HookInfo> = {
  // Lowercase addresses for stable matching
  "0x1111111111111111111111111111111111111111": {
    address: "0x1111111111111111111111111111111111111111",
    name: "Swap Hook",
  },
  "0x2222222222222222222222222222222222222222": {
    address: "0x2222222222222222222222222222222222222222",
    name: "Stake Hook",
  },
  "0x3333333333333333333333333333333333333333": {
    address: "0x3333333333333333333333333333333333333333",
    name: "Bridge Hook",
  },
};

// A tiny helper to build a tx
function tx(
  p: Partial<Transaction> & Pick<Transaction, "hash" | "from" | "to" | "valueWei">,
): Transaction {
  return {
    blockNumber: p.blockNumber ?? 0,
    timestamp: p.timestamp ?? Math.floor(Date.now() / 1000),
    network: p.network ?? "base",
    hook: p.hook,
    facilitatorFeeUsd: p.facilitatorFeeUsd ?? 0.25,
    amountUsd: p.amountUsd ?? 12.34,
    ...p,
  } as Transaction;
}

// Mock transactions across networks and hooks
export const MOCK_TRANSACTIONS: Transaction[] = [
  tx({
    hash: "0xaaa1",
    from: "0xaabbccddeeff0011223344556677889900aa0001",
    to: "0xrouter0000000000000000000000000000000000a01",
    valueWei: "100000000000000000", // 0.1 ETH
    network: "base",
    hook: MOCK_HOOKS["0x1111111111111111111111111111111111111111"],
    amountUsd: 42.5,
    facilitatorFeeUsd: 0.35,
    timestamp: Math.floor(Date.now() / 1000) - 60 * 60 * 1,
  }),
  tx({
    hash: "0xaaa2",
    from: "0xaabbccddeeff0011223344556677889900aa0002",
    to: "0xrouter0000000000000000000000000000000000a02",
    valueWei: "50000000000000000", // 0.05 ETH
    network: "base",
    hook: MOCK_HOOKS["0x2222222222222222222222222222222222222222"],
    amountUsd: 18.9,
    timestamp: Math.floor(Date.now() / 1000) - 60 * 60 * 5,
  }),
  tx({
    hash: "0xbbb1",
    from: "0xbbbbccddeeff0011223344556677889900aa0003",
    to: "0xrouter0000000000000000000000000000000000b01",
    valueWei: "210000000000000000", // 0.21 ETH
    network: "base-sepolia",
    hook: MOCK_HOOKS["0x1111111111111111111111111111111111111111"],
    amountUsd: 88.12,
    facilitatorFeeUsd: 0.45,
    timestamp: Math.floor(Date.now() / 1000) - 60 * 60 * 25,
  }),
  tx({
    hash: "0xbbb2",
    from: "0xbbbbccddeeff0011223344556677889900aa0004",
    to: "0xrouter0000000000000000000000000000000000b02",
    valueWei: "1000000000000000000", // 1 ETH
    network: "x-layer",
    hook: MOCK_HOOKS["0x3333333333333333333333333333333333333333"],
    amountUsd: 325.5,
    facilitatorFeeUsd: 1.25,
    timestamp: Math.floor(Date.now() / 1000) - 60 * 60 * 36,
  }),
  tx({
    hash: "0xccc1",
    from: "0xccccccddeeff0011223344556677889900aa0005",
    to: "0xrouter0000000000000000000000000000000000c01",
    valueWei: "25000000000000000", // 0.025 ETH
    network: "x-layer-testnet",
    amountUsd: 9.75,
    timestamp: Math.floor(Date.now() / 1000) - 60 * 20,
  }),
  tx({
    hash: "0xccc2",
    from: "0xccccccddeeff0011223344556677889900aa0006",
    to: "0xrouter0000000000000000000000000000000000c02",
    valueWei: "70000000000000000", // 0.07 ETH
    network: "x-layer",
    hook: MOCK_HOOKS["0x2222222222222222222222222222222222222222"],
    amountUsd: 26.1,
    timestamp: Math.floor(Date.now() / 1000) - 60 * 60 * 3,
  }),
  tx({
    hash: "0xddd1",
    from: "0xddddccddeeff0011223344556677889900aa0007",
    to: "0xrouter0000000000000000000000000000000000d01",
    valueWei: "123000000000000000", // 0.123 ETH
    network: "base",
    amountUsd: 50.75,
    timestamp: Math.floor(Date.now() / 1000) - 60 * 60 * 10,
  }),
  tx({
    hash: "0xddd2",
    from: "0xddddccddeeff0011223344556677889900aa0008",
    to: "0xrouter0000000000000000000000000000000000d02",
    valueWei: "333000000000000000", // 0.333 ETH
    network: "base-sepolia",
    hook: MOCK_HOOKS["0x3333333333333333333333333333333333333333"],
    amountUsd: 120.0,
    timestamp: Math.floor(Date.now() / 1000) - 60 * 60 * 48,
  }),
  tx({
    hash: "0xeee1",
    from: "0xeeeeccddeeff0011223344556677889900aa0009",
    to: "0xrouter0000000000000000000000000000000000e01",
    valueWei: "45000000000000000", // 0.045 ETH
    network: "x-layer",
    amountUsd: 17.25,
    timestamp: Math.floor(Date.now() / 1000) - 60 * 8,
  }),
  tx({
    hash: "0xeee2",
    from: "0xeeeeccddeeff0011223344556677889900aa0010",
    to: "0xrouter0000000000000000000000000000000000e02",
    valueWei: "845000000000000000", // 0.845 ETH
    network: "x-layer-testnet",
    hook: MOCK_HOOKS["0x1111111111111111111111111111111111111111"],
    amountUsd: 298.45,
    timestamp: Math.floor(Date.now() / 1000) - 60 * 60 * 2,
  }),
];

function applyFilters(items: Transaction[], q: TransactionsQuery): Transaction[] {
  let filtered = items;
  if (q.networks && q.networks.length > 0) {
    const set = new Set(q.networks);
    filtered = filtered.filter((t) => set.has(t.network));
  }
  if (q.hookAddress) {
    const target = q.hookAddress.toLowerCase();
    filtered = filtered.filter((t) =>
      t.hook?.address?.toLowerCase() === target,
    );
  }
  if (q.fromTime) {
    filtered = filtered.filter((t) => t.timestamp >= q.fromTime!);
  }
  if (q.toTime) {
    filtered = filtered.filter((t) => t.timestamp <= q.toTime!);
  }
  // Newest first
  filtered = filtered.slice().sort((a, b) => b.timestamp - a.timestamp);
  return filtered;
}

function paginate(items: Transaction[], page = 1, pageSize = 10): TransactionsResult {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return {
    items: items.slice(start, end),
    page,
    pageSize,
    total: items.length,
  };
}

export function useTransactions(query: TransactionsQuery = {}): TransactionsResult {
  const [state, setState] = React.useState<TransactionsResult>(() => {
    const filtered = applyFilters(MOCK_TRANSACTIONS, query);
    return paginate(filtered, query.page ?? 1, query.pageSize ?? 10);
  });

  // For mocked data, just recompute on query change; in real API, this would fetch
  React.useEffect(() => {
    const filtered = applyFilters(MOCK_TRANSACTIONS, query);
    setState(paginate(filtered, query.page ?? 1, query.pageSize ?? 10));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    (query.networks || []).join(","),
    query.hookAddress || "",
    query.page,
    query.pageSize,
    query.fromTime,
    query.toTime,
  ]);

  return state;
}

export function formatNetwork(n: NetworkId): string {
  switch (n) {
    case "base":
      return "Base";
    case "base-sepolia":
      return "Base Sepolia";
    case "x-layer":
      return "X Layer";
    case "x-layer-testnet":
      return "X Layer Testnet";
    default:
      return String(n);
  }
}

