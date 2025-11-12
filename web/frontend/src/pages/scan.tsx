import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SUPPORTED_NETWORKS } from "@/constants/facilitator";
import { useScanStats } from "@/hooks/use-scan-stats";
import { formatNetwork, useTransactions } from "@/hooks/use-transactions";
import type { HookInfo, Transaction } from "@/types/scan";
import * as React from "react";

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

function ScanPagination({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const makePages = () => {
    const pages: (number | "ellipsis")[] = [];
    const window = 2; // show current +/- 2
    const add = (n: number) => pages.push(n);
    const addEllipsis = () => pages.push("ellipsis");
    add(1);
    const start = Math.max(2, page - window);
    const end = Math.min(totalPages - 1, page + window);
    if (start > 2) addEllipsis();
    for (let i = start; i <= end; i++) add(i);
    if (end < totalPages - 1) addEllipsis();
    if (totalPages > 1) add(totalPages);
    return pages;
  };
  const pages = makePages();
  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;
  return (
    <div className="flex items-center justify-between pt-3">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (!prevDisabled) onChange(page - 1);
              }}
              aria-disabled={prevDisabled}
              className={
                prevDisabled ? "pointer-events-none opacity-50" : undefined
              }
            />
          </PaginationItem>
          {pages.map((p, idx) => (
            <PaginationItem key={`${p}-${idx}`}>
              {p === "ellipsis" ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  href="#"
                  isActive={p === page}
                  onClick={(e) => {
                    e.preventDefault();
                    onChange(p as number);
                  }}
                >
                  {p}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (!nextDisabled) onChange(page + 1);
              }}
              aria-disabled={nextDisabled}
              className={
                nextDisabled ? "pointer-events-none opacity-50" : undefined
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
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
          <TableHead className="text-right">Transactions</TableHead>
          <TableHead className="text-right">Volume (USD)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.hook.address}>
            <TableCell>
              <HookBadge hook={r.hook} />
            </TableCell>
            <TableCell className="text-right">{r.txCount}</TableCell>
            <TableCell className="text-right">
              {formatUsd(r.volumeUsd)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function ScanPage() {
  // Top-level filters (kept minimal for now; easily extend later)
  const [page, setPage] = React.useState(1);
  const pageSize = 8;
  const tx = useTransactions({ page, pageSize });
  const all = useTransactions({ page: 1, pageSize: 1000 });
  const stats = useScanStats({});

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Scan</h1>
        <p className="text-muted-foreground">
          Overview of facilitator activity across Base and X Layer networks.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Statistics</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Volume ($)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {formatUsd(stats.transactionVolumeUsd)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Accounts Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {stats.accountsCount.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Transaction Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {stats.transactionsCount.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Transactions</h2>
        <Tabs defaultValue="overall">
          <TabsList>
            <TabsTrigger value="overall">Overall</TabsTrigger>
            <TabsTrigger value="by-hooks">By Hooks</TabsTrigger>
          </TabsList>
          <TabsContent value="overall">
            <Card>
              <CardContent className="py-4">
                <OverallTable items={tx.items} />
              </CardContent>
            </Card>
            <ScanPagination
              page={tx.page}
              pageSize={tx.pageSize}
              total={tx.total}
              onChange={setPage}
            />
          </TabsContent>
          <TabsContent value="by-hooks">
            <Card>
              <CardContent className="py-4">
                <ByHooksTable items={all.items} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}
