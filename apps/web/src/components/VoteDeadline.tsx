import { CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { VOTE_DURATION_DAYS } from "@repo/shared";
import { voteDeadlineInfo } from "../utils/format";

export function VoteDeadline({
  start,
  resolved = false,
  compact = false,
}: {
  start: string | null | undefined;
  resolved?: boolean;
  compact?: boolean;
}) {
  const { deadlineStr, daysLeft, expired } = voteDeadlineInfo(start);
  if (!start) return <span className="text-muted-foreground">—</span>;

  const tone = resolved
    ? "secondary"
    : expired
    ? "destructive"
    : daysLeft <= 2
    ? "warning"
    : "default";

  const label = resolved
    ? `Ditutup · ${deadlineStr}`
    : expired
    ? `Kedaluwarsa · ${deadlineStr}`
    : `${daysLeft} hari lagi · ${deadlineStr}`;

  if (compact) {
    return (
      <Badge variant={tone as never} className="gap-1 rounded-sm font-normal">
        <CalendarClock className="h-3 w-3" />
        {label}
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <CalendarClock className="h-4 w-4 shrink-0 text-brand-blue" />
      <span className="text-muted-foreground">
        Durasi voting {VOTE_DURATION_DAYS} hari — berakhir{" "}
        <b className="text-foreground">{deadlineStr}</b>
        {!resolved &&
          (expired ? (
            <span className="text-destructive"> (kedaluwarsa)</span>
          ) : (
            <span> · {daysLeft} hari lagi</span>
          ))}
      </span>
    </div>
  );
}