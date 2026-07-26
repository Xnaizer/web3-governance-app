import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "../../utils/cn";

type Tone =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "secondary";

const TONE: Record<Tone, string> = {
  default: "text-foreground",
  primary: "text-brand-blue",
  success: "text-emerald-600",
  warning: "text-amber-600",
  danger: "text-destructive",
  secondary: "text-muted-foreground",
};

const ICON_TONE: Record<Tone, string> = {
  default: "text-foreground",
  primary: "text-brand-blue",
  success: "text-emerald-600",
  warning: "text-amber-600",
  danger: "text-destructive",
  secondary: "text-muted-foreground",
};

interface Props {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  hint?: string;
  to?: string;
}

export function StatCard({
  label,
  value,
  icon,
  tone = "default",
  hint,
  to,
}: Props) {
  const inner = (
    <div className="flex items-start gap-2.5 p-3.5 sm:gap-3 sm:p-5">
      {icon && (
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center text-xl sm:h-10 sm:w-10 sm:text-2xl",
            ICON_TONE[tone],
          )}
        >
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground sm:text-[11px]">
          {label}
        </p>
        <p
          className={cn(
            "mt-1 font-display text-lg font-semibold leading-tight sm:text-2xl",
            TONE[tone],
          )}
        >
          {value}
        </p>
        {hint && (
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground sm:text-xs">
            {hint}
          </p>
        )}
      </div>
    </div>
  );

  const base = "rounded-2xl border border-black/5 bg-white shadow-none";
  if (to) {
    return (
      <Link
        to={to}
        className={cn(
          base,
          "block transition-colors duration-300 hover:border-brand-blue/30",
        )}
      >
        {inner}
      </Link>
    );
  }
  return <div className={base}>{inner}</div>;
}
