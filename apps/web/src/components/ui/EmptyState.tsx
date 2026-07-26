import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

interface Props {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed px-4 py-8 text-center sm:gap-3 sm:py-12">
      <span className="text-2xl text-muted-foreground/50 sm:text-3xl">
        {icon ?? <Inbox />}
      </span>
      <p className="text-sm font-medium text-foreground sm:text-base">
        {title}
      </p>
      {description && (
        <p className="max-w-sm text-xs text-muted-foreground sm:text-sm">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
