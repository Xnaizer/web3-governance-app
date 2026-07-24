import { formatIDR, formatDate } from "@/utils/format";

export interface WithdrawalChartPoint {
  id: string;
  amount: string;
  recipientName: string | null;
  timestamp: string;
}

function toNum(v: string): number {
  try {
    return Number(BigInt(v));
  } catch {
    return 0;
  }
}

export function WithdrawalChart({
  withdrawals,
}: {
  withdrawals: WithdrawalChartPoint[];
}) {
  if (withdrawals.length === 0) return null;

  const ordered = [...withdrawals].sort(
    (a, b) => +new Date(a.timestamp) - +new Date(b.timestamp),
  );
  const amounts = ordered.map((w) => toNum(w.amount));
  const max = Math.max(...amounts, 1);
  const total = amounts.reduce((a, b) => a + b, 0);

  return (
    <div className="rounded-xl border border-black/5 bg-muted/20 p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Total ditarik per transaksi
        </span>
        <span className="font-display text-lg font-semibold text-brand-blue">
          {formatIDR(String(total))}
        </span>
      </div>
      <div className="flex h-36 items-stretch gap-1.5 overflow-x-auto pb-1">
        {ordered.map((w, i) => {
          const h = Math.max(4, (amounts[i] / max) * 100);
          return (
            <div
              key={w.id}
              className="group relative flex h-full min-w-[10px] flex-1 flex-col items-center justify-end"
              title={`${formatIDR(w.amount)} · ${w.recipientName ?? "—"} · ${formatDate(w.timestamp)}`}
            >
              <div
                className="w-full rounded-t-sm bg-brand-blue/70 transition-colors group-hover:bg-brand-blue"
                style={{ height: `${h}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
        <span>{formatDate(ordered[0].timestamp)}</span>
        {ordered.length > 1 && (
          <span>{formatDate(ordered[ordered.length - 1].timestamp)}</span>
        )}
      </div>
    </div>
  );
}
