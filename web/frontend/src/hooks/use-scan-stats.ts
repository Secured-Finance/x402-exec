import * as React from "react";
import type { Stats, TransactionsQuery } from "@/types/scan";
import { MOCK_TRANSACTIONS } from "@/hooks/use-transactions";

function computeStats(q: TransactionsQuery): Stats {
  // Rough filter to align with Transactions hook, but we keep it simple here
  const filtered = MOCK_TRANSACTIONS.filter((t) => {
    if (q.networks && q.networks.length > 0 && !q.networks.includes(t.network)) {
      return false;
    }
    if (q.hookAddress && t.hook?.address?.toLowerCase() !== q.hookAddress.toLowerCase()) {
      return false;
    }
    if (q.fromTime && t.timestamp < q.fromTime) return false;
    if (q.toTime && t.timestamp > q.toTime) return false;
    return true;
  });

  const uniqueAccounts = new Set(filtered.map((t) => t.from.toLowerCase()));
  const volume = filtered.reduce((sum, t) => sum + (t.amountUsd ?? 0), 0);
  return {
    transactionVolumeUsd: Number(volume.toFixed(2)),
    accountsCount: uniqueAccounts.size,
    transactionsCount: filtered.length,
  } satisfies Stats;
}

export function useScanStats(query: TransactionsQuery = {}): Stats {
  const [stats, setStats] = React.useState<Stats>(() => computeStats(query));
  React.useEffect(() => {
    setStats(computeStats(query));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    (query.networks || []).join(","),
    query.hookAddress || "",
    query.fromTime,
    query.toTime,
  ]);
  return stats;
}
