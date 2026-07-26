import { useNavigate } from "react-router-dom";
import { Image as ImageIcon, FolderOpen } from "lucide-react";
import type { ProgramListItem } from "../types/program";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { SkeletonCards } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusChip, IntegrityChip } from "./StatusChip";
import { formatIDR, formatShortenAddress } from "../utils/format";

function initials(s: string): string {
  return (
    s
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function ProgramBento({
  programs,
  isLoading,
}: {
  programs: ProgramListItem[];
  isLoading: boolean;
}) {
  const navigate = useNavigate();

  if (isLoading) {
    return <SkeletonCards />;
  }
  if (programs.length === 0) {
    return (
      <EmptyState
        icon={<FolderOpen />}
        title="Belum ada program"
        description="Tidak ada program pada tab ini untuk saat ini."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {programs.map((p) => {
        const cover = p.images?.[0]?.url;
        const picLabel = p.pic?.name ?? p.executorName ?? "?";
        const meta = [p.category, p.regency].filter(Boolean).join(" · ");
        return (
          <Card
            key={p.programId}
            onClick={() => navigate(`/programs/${p.programId}`)}
            className="group h-full cursor-pointer overflow-hidden rounded-2xl border-black/5 pt-0 shadow-none transition-colors duration-300 hover:border-brand-blue/30"
          >
            <div className="relative h-36 w-full overflow-hidden bg-linear-to-br from-brand-mint/30 to-brand-blue/30">
              {cover ? (
                <img
                  src={cover}
                  alt={p.title ?? `program ${p.programId}`}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-brand-blue/40">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}
              <div className="absolute left-2.5 top-2.5">
                <StatusChip status={p.status} />
              </div>
              <span className="absolute right-2.5 top-2.5 rounded-sm bg-black/55 px-2 py-0.5 font-mono text-[11px] text-white backdrop-blur-sm">
                #{p.programId}
              </span>
            </div>

            <CardContent className="flex flex-col gap-1 p-4 pb-3">
              <p className="line-clamp-1 font-display font-semibold tracking-tight">
                {p.title ?? (
                  <span className="italic text-amber-600">
                    Orphan (tanpa judul)
                  </span>
                )}
              </p>
              {meta && (
                <p className="truncate text-xs text-muted-foreground">{meta}</p>
              )}
              <p className="mt-1.5 font-mono text-base font-semibold text-brand-blue">
                {formatIDR(p.totalBudget)}
              </p>
            </CardContent>

            <CardFooter className="justify-between gap-2 border-t border-black/5 p-3">
              <div className="flex min-w-0 items-center gap-2">
                <Avatar className="h-6 w-6 shrink-0 text-[10px]">
                  {p.pic?.profilePictureURL && (
                    <AvatarImage src={p.pic.profilePictureURL} alt={picLabel} />
                  )}
                  <AvatarFallback>{initials(picLabel)}</AvatarFallback>
                </Avatar>
                <span className="truncate text-xs text-muted-foreground">
                  {p.pic?.name ??
                    p.executorName ??
                    formatShortenAddress(p.picWallet)}
                </span>
              </div>
              <IntegrityChip integrity={p.integrity} />
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}