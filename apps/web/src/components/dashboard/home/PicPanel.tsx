import { Link } from "react-router-dom";
import {
  FilePlus,
  ChevronRight,
  ArrowDownToLine,
  Send,
  Flag,
  PenLine,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusChip } from "../../StatusChip";
import { useMyPrograms } from "../../../hooks/useMyPrograms";
import { REPUTATION_BLOCKED } from "./shared";
import type { AuthUser } from "../../../types/auth";
import type { ProgramListItem } from "../../../types/program";

function allocPct(p: ProgramListItem): number {
  try {
    const total = BigInt(p.totalBudget || "0");
    if (total === 0n) return 0;
    const used = BigInt(p.totalAllocatedSoFar || "0");
    return Math.min(100, Number((used * 10000n) / total) / 100);
  } catch {
    return 0;
  }
}

function PicProgramRow({ p }: { p: ProgramListItem }) {
  const msPct =
    p.milestoneCount > 0
      ? Math.min(100, (p.currentMilestone / p.milestoneCount) * 100)
      : 0;
  const mismatch = p.isOnChain && p.integrity !== "VERIFIED";
  return (
    <Link
      to={
        p.isOnChain
          ? `/dashboard/programs/${p.programId}/manage`
          : "/dashboard/programs"
      }
      className="flex flex-col gap-2 rounded-xl border border-black/5 p-3.5 transition-colors hover:border-brand-blue/30 hover:bg-brand-blue/4"
    >
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate font-display text-sm font-medium tracking-tight">
          {p.title ?? `Program #${p.programId}`}
        </span>
        {mismatch && (
          <Badge variant="destructive" className="gap-1 rounded-sm">
            <ShieldAlert className="h-3 w-3" /> mismatch
          </Badge>
        )}
        <StatusChip status={p.status} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Milestone</span>
            <span className="font-mono">
              {p.currentMilestone}/{p.milestoneCount}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-sm bg-muted">
            <div
              className="h-full rounded-sm bg-brand-blue"
              style={{ width: `${msPct}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Teralokasi</span>
            <span className="font-mono">{allocPct(p).toFixed(0)}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-sm bg-muted">
            <div
              className="h-full rounded-sm bg-emerald-500"
              style={{ width: `${allocPct(p)}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

function PicActionItem({
  icon,
  label,
  hint,
  to,
  tone = "primary",
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  to: string;
  tone?: "primary" | "warning" | "danger" | "success";
}) {
  const toneCls =
    tone === "warning"
      ? "text-amber-600"
      : tone === "danger"
      ? "text-destructive"
      : tone === "success"
      ? "text-emerald-600"
      : "text-brand-blue";
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-xl border border-black/5 p-3 transition-colors hover:border-brand-blue/30 hover:bg-brand-blue/4"
    >
      <span className={toneCls}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

export function PicPanel({ me }: { me: AuthUser }) {
  const { data: programs, isLoading } = useMyPrograms();
  const list = programs ?? [];
  const drafts = list.filter((p) => !p.isOnChain);
  const drawable = list.filter((p) => p.status === "DRAWABLE");
  const frozen = list.filter((p) => p.status === "FROZEN");
  const running = list.filter((p) =>
    ["APPROVED", "DRAWABLE", "MILESTONE_ACHIEVED"].includes(p.status),
  );
  const mismatched = list.filter(
    (p) => p.isOnChain && p.integrity !== "VERIFIED",
  );
  const canCreate = me.isVerified && me.reputationScore >= REPUTATION_BLOCKED;

  const actions: React.ReactNode[] = [];
  if (drafts.length)
    actions.push(
      <PicActionItem
        key="draft"
        icon={<Send className="h-4 w-4" />}
        tone="warning"
        label={`Submit ${drafts.length} draft ke on-chain`}
        hint="Draft belum ter-anchor — ajukan ke kontrak"
        to="/dashboard/programs"
      />,
    );
  if (drawable.length)
    actions.push(
      <PicActionItem
        key="draw"
        icon={<ArrowDownToLine className="h-4 w-4" />}
        tone="primary"
        label={`Tarik dana (${drawable.length} program DRAWABLE)`}
        hint="Milestone cair — lakukan penarikan bertahap"
        to="/dashboard/programs"
      />,
    );
  if (frozen.length)
    actions.push(
      <PicActionItem
        key="frozen"
        icon={<Flag className="h-4 w-4" />}
        tone="danger"
        label={`Ajukan banding (${frozen.length} dibekukan)`}
        hint="Program FROZEN — ajukan banding unfreeze"
        to="/dashboard/programs"
      />,
    );
  if (canCreate)
    actions.push(
      <PicActionItem
        key="new"
        icon={<FilePlus className="h-4 w-4" />}
        tone="success"
        label="Buat program baru"
        hint="Susun proposal + milestone baru"
        to="/dashboard/create-program"
      />,
    );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="flex h-full flex-col rounded-2xl border-black/5 shadow-none lg:col-span-2">
        <CardHeader className="flex-row items-center justify-between space-y-0 font-display font-semibold tracking-tight">
          <span>Program berjalan ({running.length})</span>
          <Button asChild size="sm" variant="ghost">
            <Link to="/dashboard/programs">Program Saya</Link>
          </Button>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-2.5">
          {isLoading && (
            <p className="text-sm text-muted-foreground">Memuat…</p>
          )}
          {!isLoading && running.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
              <Sparkles className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Belum ada program berjalan.
                {canCreate && " Mulai dari “Buat program baru”."}
              </p>
            </div>
          )}
          {running.slice(0, 5).map((p) => (
            <PicProgramRow key={p.programId} p={p} />
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Card className="rounded-2xl border-black/5 shadow-none">
          <CardHeader className="flex-row items-center gap-2 space-y-0 font-display font-semibold tracking-tight">
            <PenLine className="h-4 w-4 text-brand-blue" /> Perlu tindakan
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {actions.length ? (
              actions
            ) : (
              <p className="text-sm text-muted-foreground">
                Tidak ada tindakan tertunda. 🎉
              </p>
            )}
          </CardContent>
        </Card>

        {mismatched.length > 0 && (
          <Card className="rounded-2xl border-destructive/30 bg-destructive/5 shadow-none">
            <CardContent className="flex items-start gap-2 p-4 text-sm text-destructive">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {mismatched.length} program terdeteksi <b>hash mismatch</b> —
                data Web2 berbeda dari on-chain. Periksa di Program Saya.
              </span>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
