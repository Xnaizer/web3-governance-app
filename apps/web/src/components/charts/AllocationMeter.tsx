import { formatIDR } from "../../utils/format";

function big(v: string): bigint {
  try {
    return BigInt(v);
  } catch {
    return 0n;
  }
}

export function AllocationMeter({
  allocated,
  total,
}: {
  allocated: string;
  total: string;
}) {
  const a = big(allocated);
  const t = big(total);
  const ratio = t > 0n ? Number((a * 10000n) / t) / 100 : 0;
  const clamped = Math.min(100, Math.max(0, ratio));

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-display text-xl font-semibold text-brand-blue sm:text-2xl">
          {formatIDR(allocated)}
        </span>
        <span className="text-sm text-default-500">
          dari {formatIDR(total)}
        </span>
      </div>
      <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-default-100">
        <div
          className="h-full rounded-full bg-brand-blue transition-[width] duration-700 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-default-500">
        {clamped.toFixed(1)}% teralokasi
      </p>
    </div>
  );
}
