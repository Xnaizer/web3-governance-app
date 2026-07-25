import { Link } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { QueryState } from "../../components/ui/QueryState";
import { BrandLoader } from "../../components/ui/BrandLoader";
import { ConfirmButton } from "../../components/ui/ConfirmButton";
import { DataTable } from "../../components/ui/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMyPrograms } from "../../hooks/useMyPrograms";
import { useSubmitProposal } from "../../hooks/useSubmitProposal";
import { StatusChip } from "../../components/StatusChip";
import { formatIDR } from "../../utils/format";
import type { ProgramListItem } from "../../types/program";

function SubmitButton({ p }: { p: ProgramListItem }) {
  const { submit, state, error } = useSubmitProposal(p.programId);
  return (
    <div className="flex items-center gap-2">
      <ConfirmButton
        triggerLabel="Submit on-chain"
        triggerProps={{ size: "sm", color: "primary" }}
        title={`Submit program #${p.programId} ke blockchain?`}
        confirmLabel="Ya, submit on-chain"
        toasts={{
          loading: "Submit on-chain…",
          success: "Ter-anchor on-chain.",
        }}
        action={() => submit()}
        warnings={[
          "Men-submit mengunci hash data program ON-CHAIN — data yang tersegel tidak bisa diubah lagi.",
          "Program masuk antrean voting validator (butuh min. 3 validator). Transaksi memerlukan gas.",
        ]}
      />
      {state === "syncing" && (
        <span className="text-xs text-amber-600">menunggu webhook…</span>
      )}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}

function IntegrityCell({ p }: { p: ProgramListItem }) {
  if (!p.isOnChain) {
    return (
      <Badge variant="secondary" className="rounded-sm">
        draft
      </Badge>
    );
  }
  const ok = p.integrity === "VERIFIED";
  return ok ? (
    <Badge variant="success" className="gap-1 rounded-sm">
      <ShieldCheck className="h-3 w-3" /> cocok
    </Badge>
  ) : (
    <Badge variant="destructive" className="gap-1 rounded-sm">
      <ShieldAlert className="h-3 w-3" />
      {p.integrity === "HASH_MISMATCH"
        ? "mismatch"
        : p.integrity === "ORPHAN"
        ? "orphan"
        : "anomali"}
    </Badge>
  );
}

function MilestoneCell({ p }: { p: ProgramListItem }) {
  const pct =
    p.milestoneCount > 0
      ? Math.min(100, (p.currentMilestone / p.milestoneCount) * 100)
      : 0;
  return (
    <div className="w-28">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="font-mono">
          {p.currentMilestone}/{p.milestoneCount}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-sm bg-muted">
        <div
          className="h-full rounded-sm bg-brand-blue"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function MyProgramsPage() {
  const {
    data: programs,
    isLoading,
    isError,
    error,
    refetch,
  } = useMyPrograms();

  const columns: ColumnDef<ProgramListItem, unknown>[] = [
    {
      id: "id",
      header: "ID",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          #{row.original.programId}
        </span>
      ),
    },
    {
      id: "program",
      header: "PROGRAM",
      cell: ({ row }) => (
        <Link
          to={`/programs/${row.original.programId}`}
          className="block max-w-64 truncate font-display font-medium tracking-tight hover:text-brand-blue"
        >
          {row.original.title ?? "(draft tanpa judul)"}
        </Link>
      ),
    },
    {
      id: "status",
      header: "STATUS",
      cell: ({ row }) => <StatusChip status={row.original.status} />,
    },
    {
      id: "integritas",
      header: "INTEGRITAS",
      cell: ({ row }) => <IntegrityCell p={row.original} />,
    },
    {
      id: "milestone",
      header: "MILESTONE",
      cell: ({ row }) => <MilestoneCell p={row.original} />,
    },
    {
      id: "budget",
      header: "ANGGARAN",
      cell: ({ row }) => (
        <span className="font-mono text-sm font-semibold text-brand-blue">
          {formatIDR(row.original.totalBudget)}
        </span>
      ),
    },
    {
      id: "aksi",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          {!row.original.isOnChain && <SubmitButton p={row.original} />}
          <Button asChild size="sm" variant="secondary">
            <Link to={`/dashboard/programs/${row.original.programId}/manage`}>
              Kelola
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  const mismatchCount = (programs ?? []).filter(
    (p) => p.isOnChain && p.integrity !== "VERIFIED",
  ).length;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="PIC"
        title="Program Saya"
        gradient
        subtitle="Kelola draft & program on-chain Anda."
        actions={
          <Button asChild>
            <Link to="/dashboard/create-program">+ Buat Program</Link>
          </Button>
        }
      />

      {mismatchCount > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm text-destructive">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          {mismatchCount} program terdeteksi integritas <b>tidak cocok</b> (hash
          mismatch/orphan) — data Web2 berbeda dari on-chain.
        </div>
      )}

      <QueryState
        skeleton={<BrandLoader />}
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={(programs?.length ?? 0) === 0}
        onRetry={refetch}
        emptyTitle="Belum ada program"
        emptyDescription="Buat draft program pertama Anda."
        emptyAction={
          <Button asChild variant="secondary">
            <Link to="/dashboard/create-program">Buat Program</Link>
          </Button>
        }
      >
        <DataTable columns={columns} data={programs ?? []} minWidth={880} />
      </QueryState>
    </div>
  );
}
