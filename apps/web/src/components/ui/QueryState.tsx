import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SkeletonList } from "./Skeleton";
import { EmptyState } from "./EmptyState";
import { getErrorMessage } from "../../utils/error";

interface Props {
  isLoading: boolean;
  isError?: boolean;
  error?: unknown;
  isEmpty?: boolean;
  onRetry?: () => void;
  skeleton?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: ReactNode;
  emptyAction?: ReactNode;
  children: ReactNode;
}

export function QueryState({
  isLoading,
  isError,
  error,
  isEmpty,
  onRetry,
  skeleton,
  emptyTitle = "Belum ada data",
  emptyDescription,
  emptyIcon,
  emptyAction,
  children,
}: Props) {
  if (isLoading) return <>{skeleton ?? <SkeletonList />}</>;

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-8 text-center sm:py-10">
        <AlertTriangle className="h-6 w-6 text-destructive" />
        <p className="text-sm text-destructive">
          {getErrorMessage(error) || "Gagal memuat data."}
        </p>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            Coba lagi
          </Button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        icon={emptyIcon}
        action={emptyAction}
      />
    );
  }

  return <>{children}</>;
}
