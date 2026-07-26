import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { useProgramsByStatus } from "../../hooks/useProgramsByStatus";
import { useVoteProposal } from "../../hooks/useVoteProposal";
import {
  useValidatorThreshold,
  useProposalVoteCount,
  useMyProposalVotes,
} from "../../hooks/useGovReads";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { PageHeader } from "../../components/ui/PageHeader";
import { QueryState } from "../../components/ui/QueryState";
import { BrandLoader } from "../../components/ui/BrandLoader";
import { FilterTabs } from "../../components/ui/FilterTabs";
import { SearchInput } from "../../components/ui/SearchInput";
import { DataTable } from "../../components/ui/DataTable";
import { UserCell, MissingUser } from "../../components/UserCell";
import { StatusChip } from "../../components/StatusChip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/utils/cn";
import { formatIDR, formatDate } from "../../utils/format";
import {
  getMyProposalVotes,
  type MyProposalVoteRow,
} from "../../services/programApi";
import type { ProgramListItem } from "../../types/program";

function isAnomaly(p: ProgramListItem): boolean {
  return p.isOrphan || !p.pic || p.integrity !== "VERIFIED";
}

function VoteCell({
  programId,
  total,
  threshold,
}: {
  programId: number;
  total: number;
  threshold: number;
}) {
  const count = useProposalVoteCount(programId);
  const reached = threshold > 0 && count >= threshold;
  const pct = threshold > 0 ? Math.min(100, (count / threshold) * 100) : 0;
  return (
    <div className="min-w-32">
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono font-semibold text-foreground">
          {count}/{threshold}
        </span>
        <span className="text-muted-foreground">{total} val</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-sm bg-muted">
        <div
          className={cn(
            "h-full rounded-sm transition-all",
            reached ? "bg-emerald-500" : "bg-brand-blue",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function VoteBtn({ p }: { p: ProgramListItem }) {
  const { vote, busy } = useVoteProposal(p.programId);
  const [open, setOpen] = useState(false);
  const confirm = async () => {
    const pr = vote();
    toast.promise(pr, {
      loading: "Mengirim vote…",
      success: "Vote terkirim (tally menyusul via webhook).",
      error: (e) => (e as Error)?.message ?? "Gagal",
    });
    try {
      await pr;
      setOpen(false);
    } catch {}
  };
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Setujui
      </Button>
      <ConfirmDialog
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={confirm}
        isLoading={busy}
        title={`Setujui proposal #${p.programId}?`}
        confirmLabel="Ya, kirim vote"
        warnings={[
          "Vote persetujuan bersifat FINAL dan tidak bisa dibatalkan setelah masuk ke blockchain.",
          "Menyetujui berarti mengizinkan pencairan anggaran program ini bila ambang BFT (⌊2N/3⌋+1) tercapai.",
          "Transaksi memerlukan gas — pastikan wallet & jaringan Base Sepolia sudah benar.",
        ]}
      />
    </>
  );
}

export function ProposalsPage() {
  const { data, isLoading, isError, error, refetch } = useProgramsByStatus([
    "PENDING",
  ]);
  const { total, threshold } = useValidatorThreshold();
  const [tab, setTab] = useState<"VALID" | "ANOMALY" | "VOTED">("VALID");
  const [search, setSearch] = useState("");

  const programIds = useMemo(
    () => (data ?? []).map((p) => p.programId),
    [data],
  );
  // Only meaningful for still-PENDING programs — used to swap the
  // "Setujui" button for a "Sudah vote" badge so a validator doesn't try
  // to vote twice on something still open.
  const votedSet = useMyProposalVotes(programIds);

  const { valid, anomaly } = useMemo(() => {
    const valid: ProgramListItem[] = [];
    const anomaly: ProgramListItem[] = [];
    (data ?? []).forEach((p) => (isAnomaly(p) ? anomaly : valid).push(p));
    return { valid, anomaly };
  }, [data]);

  // Full history of every program this validator has ever voted on,
  // regardless of its current status — a program that already got
  // APPROVED (and so left the PENDING list above) still shows up here.
  const history = useQuery({
    queryKey: ["my-proposal-votes"],
    queryFn: getMyProposalVotes,
  });
  const historyRows = history.data ?? [];

  const shown = useMemo(() => {
    const base = tab === "ANOMALY" ? anomaly : valid;
    const s = search.trim().toLowerCase();
    if (!s) return base;
    return base.filter((p) => {
      const hay = [
        String(p.programId),
        p.title,
        p.pic?.name,
        p.pic?.username,
        p.executorName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(s);
    });
  }, [tab, valid, anomaly, search]);

  const shownHistory = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return historyRows;
    return historyRows.filter((row) => {
      const p = row.program;
      const hay = [
        String(p.programId),
        p.title,
        p.pic?.name,
        p.pic?.username,
        p.executorName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(s);
    });
  }, [historyRows, search]);

  const historyColumns: ColumnDef<MyProposalVoteRow, unknown>[] = [
    {
      id: "id",
      header: "ID",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          #{row.original.program.programId}
        </span>
      ),
    },
    {
      id: "program",
      header: "PROGRAM",
      cell: ({ row }) => (
        <Link
          to={`/programs/${row.original.program.programId}`}
          className="block max-w-55 truncate font-display font-medium tracking-tight hover:text-brand-blue"
        >
          {row.original.program.title ?? "(tanpa judul)"}
        </Link>
      ),
    },
    {
      id: "pic",
      header: "PIC",
      cell: ({ row }) => (
        <UserCell
          user={row.original.program.pic}
          wallet={row.original.program.picWallet}
        />
      ),
    },
    {
      id: "budget",
      header: "ANGGARAN",
      cell: ({ row }) => (
        <span className="font-mono text-sm font-semibold text-brand-blue">
          {formatIDR(row.original.program.totalBudget)}
        </span>
      ),
    },
    {
      id: "status",
      header: "STATUS PROGRAM",
      cell: ({ row }) => <StatusChip status={row.original.program.status} />,
    },
    {
      id: "votedAt",
      header: "WAKTU VOTE",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {formatDate(row.original.votedAt)}
        </span>
      ),
    },
    {
      id: "aksi",
      header: "",
      cell: ({ row }) => (
        <Button asChild size="sm" variant="secondary">
          <Link to={`/programs/${row.original.program.programId}`}>
            Detail
          </Link>
        </Button>
      ),
    },
  ];

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
          className="block max-w-55 truncate font-display font-medium tracking-tight hover:text-brand-blue"
        >
          {row.original.title ?? "(tanpa judul)"}
        </Link>
      ),
    },
    {
      id: "pic",
      header: "PIC",
      cell: ({ row }) =>
        isAnomaly(row.original) ? (
          <MissingUser
            wallet={row.original.picWallet}
            reason={row.original.isOrphan ? "Orphan" : "PIC tidak terdaftar"}
          />
        ) : (
          <UserCell user={row.original.pic} wallet={row.original.picWallet} />
        ),
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
      id: "suara",
      header: "SUARA",
      cell: ({ row }) => (
        <VoteCell
          programId={row.original.programId}
          total={total}
          threshold={threshold}
        />
      ),
    },
    {
      id: "aksi",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          <Button asChild size="sm" variant="secondary">
            <Link to={`/programs/${row.original.programId}`}>Detail</Link>
          </Button>
          {isAnomaly(row.original) ? (
            <span className="whitespace-nowrap text-[11px] text-amber-600">
              tinjau dulu
            </span>
          ) : votedSet.has(row.original.programId) ? (
            <Badge
              variant="secondary"
              className="gap-1 whitespace-nowrap rounded-sm text-emerald-700"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Sudah vote
            </Badge>
          ) : (
            <VoteBtn p={row.original} />
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Validator"
        title="Voting Proposal"
        gradient
        subtitle="Program PENDING menunggu persetujuan validator (BFT ⌊2N/3⌋+1)."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <FilterTabs
          items={[
            { key: "VALID", label: `Bisa Divote (${valid.length})` },
            { key: "ANOMALY", label: `Anomali (${anomaly.length})` },
            {
              key: "VOTED",
              label: `Riwayat Vote Saya (${historyRows.length})`,
            },
          ]}
          value={tab}
          onChange={setTab}
        />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Cari nama program atau PIC…"
          className="sm:ml-auto sm:max-w-xs"
        />
      </div>

      {tab === "VOTED" ? (
        <QueryState
          skeleton={<BrandLoader />}
          isLoading={history.isLoading}
          isError={history.isError}
          error={history.error}
          isEmpty={shownHistory.length === 0}
          onRetry={history.refetch}
          emptyTitle="Belum ada riwayat vote"
          emptyDescription="Program yang pernah kamu setujui — baik yang masih menunggu maupun yang sudah disetujui/ditolak — akan muncul di sini."
        >
          <DataTable
            columns={historyColumns}
            data={shownHistory}
            minWidth={860}
          />
        </QueryState>
      ) : (
        <QueryState
          skeleton={<BrandLoader />}
          isLoading={isLoading}
          isError={isError}
          error={error}
          isEmpty={shown.length === 0}
          onRetry={refetch}
          emptyTitle={
            tab === "ANOMALY"
              ? "Tidak ada proposal anomali"
              : "Tidak ada proposal menunggu"
          }
          emptyDescription={
            tab === "ANOMALY"
              ? "Proposal tanpa PIC terdaftar / orphan akan dipisahkan ke sini."
              : "Proposal PENDING yang valid akan muncul di sini."
          }
        >
          <DataTable columns={columns} data={shown} minWidth={820} />
        </QueryState>
      )}
    </div>
  );
}
