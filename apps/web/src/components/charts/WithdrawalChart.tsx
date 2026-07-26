import { useState } from "react";
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

function formatCompactIDR(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) {
    return `Rp${(amount / 1_000_000_000).toLocaleString("id-ID", {
      maximumFractionDigits: 1,
    })}M`;
  }
  if (abs >= 1_000_000) {
    return `Rp${(amount / 1_000_000).toLocaleString("id-ID", {
      maximumFractionDigits: 1,
    })}jt`;
  }
  if (abs >= 1_000) {
    return `Rp${(amount / 1_000).toLocaleString("id-ID", {
      maximumFractionDigits: 0,
    })}rb`;
  }
  return `Rp${amount}`;
}

const BRAND_BLUE = "#4899EA";

export function WithdrawalChart({
  withdrawals,
}: {
  withdrawals: WithdrawalChartPoint[];
}) {
  const [hover, setHover] = useState<number | null>(null);

  if (withdrawals.length === 0) return null;

  // oldest -> newest, left to right
  const ordered = [...withdrawals].sort(
    (a, b) => +new Date(a.timestamp) - +new Date(b.timestamp),
  );
  const amounts = ordered.map((w) => toNum(w.amount));
  const total = amounts.reduce((a, b) => a + b, 0);
  const max = Math.max(...amounts);
  const min = Math.min(...amounts, 0);
  const range = max - min;

  const W = 640;
  const H = 200;
  const padX = 28;
  const padTop = 30;
  const padBottom = 26;
  const innerW = W - padX * 2;
  const innerH = H - padTop - padBottom;
  const n = ordered.length;

  const xFor = (i: number) =>
    n === 1 ? padX + innerW / 2 : padX + (innerW * i) / (n - 1);
  const yFor = (v: number) =>
    range === 0
      ? padTop + innerH / 2
      : padTop + innerH - ((v - min) / range) * innerH;

  const points = ordered.map((w, i) => ({
    x: xFor(i),
    y: yFor(amounts[i]),
    amount: amounts[i],
    w,
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");
  const areaPath = `${linePath} L${points[n - 1].x},${padTop + innerH} L${points[0].x},${padTop + innerH} Z`;

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

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full overflow-visible"
        style={{ height: H }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="withdrawal-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BRAND_BLUE} stopOpacity={0.22} />
            <stop offset="100%" stopColor={BRAND_BLUE} stopOpacity={0} />
          </linearGradient>
        </defs>

        <path d={areaPath} fill="url(#withdrawal-area)" stroke="none" />
        <path
          d={linePath}
          fill="none"
          stroke={BRAND_BLUE}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {points.map((p, i) => (
          <g
            key={p.w.id}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            className="cursor-pointer"
          >
            <text
              x={p.x}
              y={p.y - 12}
              textAnchor="middle"
              fontSize={10}
              fontWeight={600}
              fill={BRAND_BLUE}
            >
              {formatCompactIDR(p.amount)}
            </text>
            {/* larger invisible hit area for easier hovering */}
            <circle cx={p.x} cy={p.y} r={11} fill="transparent" />
            <circle
              cx={p.x}
              cy={p.y}
              r={hover === i ? 5.5 : 3.5}
              fill={BRAND_BLUE}
              stroke="white"
              strokeWidth={1.5}
              className="transition-all"
            />
          </g>
        ))}
      </svg>

      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{formatDate(ordered[0].timestamp)}</span>
        {ordered.length > 1 && (
          <span>{formatDate(ordered[ordered.length - 1].timestamp)}</span>
        )}
      </div>

      <p className="mt-2 h-4 text-center text-xs text-muted-foreground">
        {hover !== null && (
          <>
            {formatIDR(String(amounts[hover]))} ·{" "}
            {ordered[hover].recipientName ?? "—"} ·{" "}
            {formatDate(ordered[hover].timestamp)}
          </>
        )}
      </p>
    </div>
  );
}
