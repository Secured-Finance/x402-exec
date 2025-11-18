import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SUPPORTED_NETWORKS } from "@/constants/facilitator";
import { useFacilitatorStats, formatUsdcAtomicToDisplay } from "@/hooks/use-facilitator-stats";
import { formatNetwork, useTransactions } from "@/hooks/use-transactions";
import type { HookInfo, Transaction } from "@/types/scan";

function formatUsd(v: number | undefined): string {
  const n = Number.isFinite(v as number) ? (v as number) : 0;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

function formatTime(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleString();
}

function shortHex(s: string, head = 6, tail = 4) {
  if (!s) return "";
  if (s.length <= head + tail + 3) return s;
  return `${s.slice(0, head)}...${s.slice(-tail)}`;
}

function getTxUrl(t: Transaction): string {
  const entry = SUPPORTED_NETWORKS.find((n) => n.network === t.network);
  const base = entry?.txExplorerBaseUrl;
  if (base) return `${base}${t.hash}`;
  // Fallback to a common pattern if base is unavailable
  switch (t.network) {
    case "base":
      return `https://basescan.org/tx/${t.hash}`;
    case "base-sepolia":
      return `https://sepolia.basescan.org/tx/${t.hash}`;
    case "x-layer":
      return `https://www.oklink.com/xlayer/tx/${t.hash}`;
    case "x-layer-testnet":
      return `https://www.oklink.com/xlayer-test/tx/${t.hash}`;
    default:
      return `https://etherscan.io/tx/${t.hash}`;
  }
}

function HookBadge({ hook }: { hook?: HookInfo }) {
  if (!hook) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <Badge variant="outline">{hook.name ?? "Hook"}</Badge>
      <span className="text-muted-foreground text-xs">
        {shortHex(hook.address)}
      </span>
    </span>
  );
}

function OverallTable({ items }: { items: Transaction[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tx Hash</TableHead>
          <TableHead>Network</TableHead>
          <TableHead>Time</TableHead>
          <TableHead>From</TableHead>
          <TableHead>To</TableHead>
          <TableHead>Hook</TableHead>
          <TableHead className="text-right">Amount (USD)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((t) => (
          <TableRow
            key={t.hash}
            className="cursor-pointer"
            onClick={() =>
              window.open(getTxUrl(t), "_blank", "noopener,noreferrer")
            }
          >
            <TableCell className="font-mono text-xs">
              <a
                href={getTxUrl(t)}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="underline-offset-2 hover:underline"
              >
                {shortHex(t.hash, 10, 8)}
              </a>
            </TableCell>
            <TableCell>
              <Badge variant="secondary">{formatNetwork(t.network)}</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {formatTime(t.timestamp)}
            </TableCell>
            <TableCell className="font-mono text-xs">
              {shortHex(t.from)}
            </TableCell>
            <TableCell className="font-mono text-xs">
              {shortHex(t.to)}
            </TableCell>
            <TableCell>
              <HookBadge hook={t.hook} />
            </TableCell>
            <TableCell className="text-right">
              {formatUsd(t.amountUsd ?? 0)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

type HookAgg = {
  hook: HookInfo;
  txCount: number;
  volumeUsd: number;
};

function aggregateByHook(items: Transaction[]): HookAgg[] {
  const map = new Map<string, HookAgg>();
  for (const t of items) {
    const addr = t.hook?.address?.toLowerCase();
    if (!addr) continue;
    if (!map.has(addr)) {
      map.set(addr, {
        hook: t.hook!,
        txCount: 0,
        volumeUsd: 0,
      });
    }
    const agg = map.get(addr)!;
    agg.txCount += 1;
    agg.volumeUsd += t.amountUsd ?? 0;
  }
  return Array.from(map.values()).sort((a, b) => b.volumeUsd - a.volumeUsd);
}

function ByHooksTable({ items }: { items: Transaction[] }) {
  const rows = aggregateByHook(items);
  if (rows.length === 0) {
    return (
      <div className="text-muted-foreground">
        No hook activity in the sample data.
      </div>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Hook</TableHead>
          <TableHead className="text-right">Unique Payers</TableHead>
          <TableHead className="text-right">Transactions</TableHead>
          <TableHead className="text-right">Volume (USD)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const uniquePayers = new Set(
            items
              .filter((t) => t.hook?.address?.toLowerCase() === r.hook.address.toLowerCase())
              .map((t) => t.from.toLowerCase()),
          ).size;
          return (
            <TableRow key={r.hook.address}>
              <TableCell>
                <HookBadge hook={r.hook} />
              </TableCell>
              <TableCell className="text-right">{uniquePayers}</TableCell>
              <TableCell className="text-right">{r.txCount}</TableCell>
              <TableCell className="text-right">{formatUsd(r.volumeUsd)}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

type ApiTopHook = { address: string; txCount: number; uniquePayers: number; total: string };

function TopHooksTableApi({ rows }: { rows: ApiTopHook[] }) {
  if (!rows || rows.length === 0) {
    return <div className="text-muted-foreground">No hook activity found.</div>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Hook Address</TableHead>
          <TableHead className="text-right">Unique Payers</TableHead>
          <TableHead className="text-right">Transactions</TableHead>
          <TableHead className="text-right">Total (USDC)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.address}>
            <TableCell className="font-mono text-xs">{shortHex(r.address)}</TableCell>
            <TableCell className="text-right">{r.uniquePayers}</TableCell>
            <TableCell className="text-right">{r.txCount}</TableCell>
            <TableCell className="text-right">{formatUsdcAtomicToDisplay(r.total, 2)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function ScanPage() {
  // Latest tx (sample data for now)
  const pageSize = 20;
  const tx = useTransactions({ page: 1, pageSize });
  const all = useTransactions({ page: 1, pageSize: 1000 });
  const stats = useFacilitatorStats({});

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Stats</h1>
          <p className="text-muted-foreground">Overview of facilitator activity across all networks.</p>
        </div>
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">See All on Explorer</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {SUPPORTED_NETWORKS.map((n) => (
                <DropdownMenuItem asChild key={n.network}>
                  <a href={n.explorerUrl} target="_blank" rel="noreferrer">
                    {n.name}
                  </a>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <section className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Total Value (USDC)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {stats.data ? formatUsdcAtomicToDisplay(stats.data.totalValueAtomic, 2) : "…"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Unique Payers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {stats.data ? stats.data.accountsCount.toLocaleString() : "…"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Total Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {stats.data ? stats.data.transactionsCount.toLocaleString() : "…"}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Latest Transactions</h2>
        <Card>
          <CardContent className="py-4">
            <OverallTable items={tx.items} />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Top Hook Contracts</h2>
        <Card>
          <CardContent className="py-4">
            {stats.data?.topHooks?.length ? (
              <TopHooksTableApi rows={stats.data.topHooks as any} />
            ) : (
              <ByHooksTable items={all.items} />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
