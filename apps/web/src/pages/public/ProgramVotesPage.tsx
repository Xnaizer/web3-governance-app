import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Landmark, ShieldAlert } from "lucide-react";
import { ListShell } from "../../components/layout/ListShell";
import { PageHeader } from "../../components/ui/PageHeader";
import { QueryState } from "../../components/ui/QueryState";
import { Reveal } from "../../components/motion/Reveal";
import { Paginator } from "../../components/ui/Paginator";
import { SearchInput } from "../../components/ui/SearchInput";
import { FilterTabs } from "../../components/ui/FilterTabs";
import { DataTable } from "../../components/ui/DataTable";
import { UserCell } from "../../components/UserCell";
import { StatusChip } from "../../components/StatusChip";
import { Badge } from "@/components/ui/badge";
import {
  fetchProposalVotes,
  fetchUnfreezeVotes,
  type ProposalVoteRow,
  type UnfreezeVoteRow,
} from "../../services/votesApi";
import { formatIDR, formatDate } from "../../utils/format";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useBriefLoading } from "../../hooks/useBriefLoading";

const TABS = [
  { key: "PROPOSAL", label: "Vote Proposal Program" },
  { key: "UNFREEZE", label: "Vote Unfreeze Program" },
] as const;

function matchesSearch(
  search: string,
  program: { programId: number; title: string | null; pic: { name: string | null; username: string } | null } | null,
) {
  const s = search.trim().toLowerCase();
  if (!s) return true;
  if (!program) return false;
  const hay = [
    String(program.programId),
    program.title,
    program.pic?.name,
    program.pic?.username,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(s);
}

export function ProgramVotesPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("PROPOSAL");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search);

  const proposalQ = useQuery({
    queryKey: ["proposal-votes", page],
    queryFn: () => fetchProposalVotes({ page, limit: 12 }),
    placeholderData: (prev) => prev,
    enabled: tab === "PROPOSAL",
  });
  const unfreezeQ = useQuery({
    queryKey: ["unfreeze-votes", page],
    queryFn: () => fetchUnfreezeVotes({ page, limit: 12 }),
    placeholderData: (prev) => prev,
    enabled: tab === "UNFREEZE",
  });

  const activeQ = tab === "PROPOSAL" ? proposalQ : unfreezeQ;
  const totalPages = activeQ.data?.pagination?.totalPages ?? 1;

  const proposalRows = useMemo(
    () =>
      (proposalQ.data?.rows ?? []).filter((r) =>
        matchesSearch(debounced, r.program),
      ),
    [proposalQ.data, debounced],
  );
  const unfreezeRows = useMemo(
    () =>
      (unfreezeQ.data?.rows ?? []).filter((r) =>
        matchesSearch(debounced, r.program),
      ),
    [unfreezeQ.data, debounced],
  );

  const flashing = useBriefLoading(`${tab}|${debounced}|${page}`);

  const proposalColumns: ColumnDef<ProposalVoteRow, unknown>[] = [
    {
      id: "id",
      header: "ID",
      cell: ({ row }) => (
        <span className="font-semibold">#{row.original.programId}</span>
      ),
    },
    {
      id: "program",
      header: "PROGRAM",
      cell: ({ row }) => (
        <span className="block max-w-64 truncate font-display font-medium tracking-tight">
          {row.original.program?.title ?? "(tanpa judul)"}
        </span>
      ),
    },
    {
      id: "pic",
      header: "PIC",
      cell: ({ row }) => (
        <UserCell
          user={row.original.program?.pic ?? null}
          wallet={row.original.program?.picWallet}
        />
      ),
    },
    {
      id: "anggaran",
      header: "ANGGARAN",
      cell: ({ row }) => (
        <span className="font-mono text-sm font-semibold text-brand-blue">
          {row.original.program ? formatIDR(row.original.program.totalBudget) : "—"}
        </span>
      ),
    },
    {
      id: "status",
      header: "STATUS PROGRAM",
      cell: ({ row }) =>
        row.original.program ? (
          <StatusChip status={row.original.program.status} />
        ) : (
          "—"
        ),
    },
    {
      id: "suara",
      header: "SUARA",
      cell: ({ row }) => (
        <Badge variant="secondary" className="rounded-sm">
          {row.original.voteCount} suara
        </Badge>
      ),
    },
    {
      id: "terakhir",
      header: "VOTE TERAKHIR",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {formatDate(row.original.lastVotedAt)}
        </span>
      ),
    },
  ];

  const unfreezeColumns: ColumnDef<UnfreezeVoteRow, unknown>[] = [
    {
      id: "id",
      header: "ID",
      cell: ({ row }) => (
        <span className="font-semibold">#{row.original.programId}</span>
      ),
    },
    {
      id: "program",
      header: "PROGRAM",
      cell: ({ row }) => (
        <span className="block max-w-64 truncate font-display font-medium tracking-tight">
          {row.original.program?.title ?? "(tanpa judul)"}
        </span>
      ),
    },
    {
      id: "pic",
      header: "PIC",
      cell: ({ row }) => (
        <UserCell
          user={row.original.program?.pic ?? null}
          wallet={row.original.picWallet}
        />
      ),
    },
    {
      id: "suara",
      header: "SUARA",
      cell: ({ row }) => (
        <div className="flex gap-1.5">
          <Badge variant="success" className="rounded-sm">
            Setuju {row.original.approveVotes}
          </Badge>
          <Badge variant="destructive" className="rounded-sm">
            Tolak {row.original.rejectVotes}
          </Badge>
        </div>
      ),
    },
    {
      id: "status",
      header: "STATUS BANDING",
      cell: ({ row }) => (
        <Badge
          variant={row.original.resolved ? "success" : "warning"}
          className="rounded-sm"
        >
          {row.original.resolved ? "Selesai" : "Berjalan"}
        </Badge>
      ),
    },
    {
      id: "mulai",
      header: "MULAI BANDING",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {formatDate(row.original.appealStartedAt)}
        </span>
      ),
    },
  ];

  return (
    <ListShell max="max-w-5xl">
      <PageHeader
        eyebrow="Governance"
        title="Voting Program"
        gradient
        subtitle="Transparansi voting BFT validator: persetujuan proposal program dan banding pembekuan (unfreeze) dana."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <FilterTabs
          items={TABS as unknown as { key: string; label: string }[]}
          value={tab}
          onChange={(k) => {
            setTab(k as (typeof TABS)[number]["key"]);
            setPage(1);
          }}
        />
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Cari nama program / PIC / #ID…"
          className="sm:ml-auto sm:max-w-xs"
        />
      </div>

      {tab === "PROPOSAL" ? (
        <QueryState
          isLoading={proposalQ.isLoading || flashing}
          isError={proposalQ.isError}
          error={proposalQ.error}
          isEmpty={proposalRows.length === 0}
          onRetry={proposalQ.refetch}
          emptyIcon={<Landmark />}
          emptyTitle="Belum ada vote proposal"
          emptyDescription="Vote persetujuan proposal program oleh validator akan muncul di sini."
        >
          <Reveal>
            <DataTable
              columns={proposalColumns}
              data={proposalRows}
              minWidth={860}
              onRowClick={(v) => navigate(`/programs/${v.programId}`)}
            />
          </Reveal>
        </QueryState>
      ) : (
        <QueryState
          isLoading={unfreezeQ.isLoading || flashing}
          isError={unfreezeQ.isError}
          error={unfreezeQ.error}
          isEmpty={unfreezeRows.length === 0}
          onRetry={unfreezeQ.refetch}
          emptyIcon={<ShieldAlert />}
          emptyTitle="Belum ada vote unfreeze"
          emptyDescription="Banding pembekuan dana (unfreeze appeal) beserta hasil votingnya akan muncul di sini."
        >
          <Reveal>
            <DataTable
              columns={unfreezeColumns}
              data={unfreezeRows}
              minWidth={860}
              onRowClick={(v) => navigate(`/programs/${v.programId}`)}
            />
          </Reveal>
        </QueryState>
      )}

      <Paginator page={page} totalPages={totalPages} onChange={setPage} />
    </ListShell>
  );
}
