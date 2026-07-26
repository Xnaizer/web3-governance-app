import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Users, Layers, SquarePen, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCell } from "../../UserCell";
import { StatusChip } from "../../StatusChip";
import { useValidatorThreshold } from "../../../hooks/useGovReads";
import { fetchUnfreezeVotes } from "../../../services/votesApi";
import { listProgramsAuthed } from "../../../services/programApi";
import { formatShortenAddress, formatIDR } from "../../../utils/format";
import type { ProgramListItem } from "../../../types/program";

function AuditorDrawableRow({ p }: { p: ProgramListItem }) {
  return (
    <div className="flex items-center gap-3 border-b border-black/5 py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <Link
          to={`/programs/${p.programId}`}
          className="flex items-center gap-2"
        >
          <span className="font-mono text-xs text-muted-foreground">
            #{p.programId}
          </span>
          <span className="truncate font-display font-medium tracking-tight hover:text-brand-blue">
            {p.title ?? "(tanpa judul)"}
          </span>
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="font-mono font-semibold text-brand-blue">
            {formatIDR(p.totalBudget)}
          </span>
          <span>
            · milestone {p.currentMilestone}/{p.milestoneCount}
          </span>
          {p.pic ? (
            <UserCell user={p.pic} wallet={p.picWallet} />
          ) : (
            <span className="font-mono">
              {formatShortenAddress(p.picWallet)}
            </span>
          )}
        </div>
      </div>
      <StatusChip status={p.status} />
    </div>
  );
}

function AuditorAppealRow({
  programId,
  approveVotes,
  rejectVotes,
  threshold,
}: {
  programId: number;
  approveVotes: number;
  rejectVotes: number;
  threshold: number;
}) {
  const tot = approveVotes + rejectVotes || 1;
  return (
    <div className="border-b border-black/5 py-3 last:border-0">
      <div className="flex items-center justify-between">
        <Link
          to={`/programs/${programId}`}
          className="font-display font-medium tracking-tight hover:text-brand-blue"
        >
          Program #{programId}
        </Link>
        <span className="text-xs text-muted-foreground">
          ambang {threshold}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs font-medium">
        <span className="text-emerald-600">Setuju {approveVotes}</span>
        <span className="text-destructive">Tolak {rejectVotes}</span>
      </div>
      <div className="mt-1.5 flex h-2 overflow-hidden rounded-sm bg-muted">
        <span
          className="bg-emerald-500"
          style={{ width: `${(approveVotes / tot) * 100}%` }}
        />
        <span
          className="bg-destructive"
          style={{ width: `${(rejectVotes / tot) * 100}%` }}
        />
      </div>
    </div>
  );
}

export function AuditorPanel() {
  const programs = useQuery({
    queryKey: ["dash-programs"],
    queryFn: async () => (await listProgramsAuthed({ limit: 100 })).programs,
    staleTime: 30_000,
  });
  const appeals = useQuery({
    queryKey: ["unfreeze-votes", "preview"],
    queryFn: () => fetchUnfreezeVotes({ limit: 6 }),
    staleTime: 30_000,
  });
  const { threshold } = useValidatorThreshold();

  const drawable = (programs.data ?? []).filter(
    (p) => p.isOnChain && p.status === "DRAWABLE",
  );
  const activeAppeals = (appeals.data?.rows ?? []).filter((a) => !a.resolved);

  const monitorLinks = [
    {
      to: "/programs",
      icon: <Layers className="h-4 w-4" />,
      label: "Semua Program",
    },
    {
      to: "/users",
      icon: <Users className="h-4 w-4" />,
      label: "Direktori Pengguna",
    },
    {
      to: "/dashboard/sign",
      icon: <SquarePen className="h-4 w-4" />,
      label: "Tanda Tangan Milestone",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="flex h-full flex-col rounded-2xl border-black/5 shadow-none lg:col-span-2">
        <CardHeader className="flex-row items-center justify-between space-y-0 font-display font-semibold tracking-tight">
          <span>Bisa dibekukan ({drawable.length})</span>
          <Button asChild size="sm" variant="ghost">
            <Link to="/dashboard/audit">Audit</Link>
          </Button>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col">
          {drawable.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Tidak ada program DRAWABLE.
            </p>
          )}
          {drawable.slice(0, 6).map((p) => (
            <AuditorDrawableRow key={p.programId} p={p} />
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Card className="rounded-2xl border-black/5 shadow-none">
          <CardHeader className="font-display font-semibold tracking-tight">
            Banding berjalan ({activeAppeals.length})
          </CardHeader>
          <CardContent className="flex flex-col">
            {activeAppeals.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Tidak ada banding.
              </p>
            )}
            {activeAppeals.slice(0, 5).map((a) => (
              <AuditorAppealRow
                key={a.id}
                programId={a.programId}
                approveVotes={a.approveVotes ?? 0}
                rejectVotes={a.rejectVotes ?? 0}
                threshold={threshold}
              />
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-black/5 shadow-none">
          <CardHeader className="font-display font-semibold tracking-tight">
            Monitoring
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {monitorLinks.map((m) => (
              <Link
                key={m.to}
                to={m.to}
                className="flex items-center gap-3 rounded-xl border border-black/5 p-3 transition-colors hover:border-brand-blue/30 hover:bg-brand-blue/4"
              >
                <span className="text-brand-blue">{m.icon}</span>
                <span className="text-sm font-medium">{m.label}</span>
                <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
