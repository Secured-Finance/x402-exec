// Types for the Scan page (transactions, stats, hooks)
// These mirror the planned backend API shape but keep it minimal for the UI

export type NetworkId =
  | "base"
  | "base-sepolia"
  | "x-layer"
  | "x-layer-testnet";

export type HookInfo = {
  // Hook contract address; use lowercase checksummed or raw for now
  address: string;
  // Optional friendly name registered on our side
  name?: string;
};

export type Transaction = {
  // Basic etherscan-like fields
  hash: string;
  from: string;
  to: string;
  valueWei: string; // keep raw string; formatting handled in UI
  blockNumber?: number;
  timestamp: number; // unix seconds

  // Extensions
  network: NetworkId;
  hook?: HookInfo; // The hook contract the router called, if any
  facilitatorFeeUsd?: number; // simple numeric for display
  amountUsd?: number; // derived payment value in USD
};

export type Stats = {
  // Total USD processed by our facilitator
  transactionVolumeUsd: number;
  // Number of unique accounts that used our facilitator (unique senders)
  accountsCount: number;
  // Number of processed transactions
  transactionsCount: number;
};

export type TransactionsQuery = {
  networks?: NetworkId[];
  hookAddress?: string; // filter by specific hook
  // Simple pagination, client-side for mock data
  page?: number; // 1-based
  pageSize?: number;
  // Optional time range (unix seconds)
  fromTime?: number;
  toTime?: number;
};

export type TransactionsResult = {
  items: Transaction[];
  page: number;
  pageSize: number;
  total: number;
};

