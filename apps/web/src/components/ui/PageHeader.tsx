import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

interface Props {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  eyebrow?: string;
  gradient?: boolean;
  back?: boolean | string;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
  gradient,
  back,
}: Props) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 items-start gap-2">
        {back && (
          <Button
            size="icon"
            variant="ghost"
            aria-label="Kembali"
            className="mt-0.5 shrink-0"
            onClick={() =>
              typeof back === "string" ? navigate(back) : navigate(-1)
            }
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-brand-blue sm:text-xs">
              {eyebrow}
            </span>
          )}
          <h1
            className={cn(
              "font-display text-xl font-semibold tracking-tight sm:text-2xl",
              eyebrow && "mt-1.5 sm:mt-2",
              gradient && "text-gradient",
            )}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 max-w-2xl text-xs text-muted-foreground sm:text-sm">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
