import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { ListShell } from "../../components/layout/ListShell";
import { PageHeader } from "../../components/ui/PageHeader";
import { Gavel } from "lucide-react";
import { QueryState } from "../../components/ui/QueryState";
import { Reveal } from "../../components/motion/Reveal";
import { Paginator } from "../../components/ui/Paginator";
import { SearchInput } from "../../components/ui/SearchInput";
import { FilterTabs } from "../../components/ui/FilterTabs";
import { DataTable } from "../../components/ui/DataTable";
import { UserCell } from "../../components/UserCell";
import { Badge } from "@/components/ui/badge";
import { fetchRoleVotes } from "../../services/votesApi";
import { impliedTotalFromThreshold } from "../../utils/bft";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useBriefLoading } from "../../hooks/useBriefLoading";

const FILTERS = [
  { key: "ALL", label: "Semua" },
  { key: "ONGOING", label: "Berjalan" },
  { key: "DONE", label: "Selesai" },
  { key: "GRANT", label: "Grant" },
  { key: "DEVOTE", label: "Devote" },
] as const;

export function VotesPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const q = useQuery({
    queryKey: ["role-votes", page],
    queryFn: () => fetchRoleVotes({ page, limit: 12 }),
    placeholderData: (prev) => prev,
  });
  const rows = q.data?.rows ?? [];
  const totalPages = q.data?.pagination?.totalPages ?? 1;
  const [filter, setFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search);

  const filtered = useMemo(() => {
    const s = debounced.trim().toLowerCase();
    return rows.filter((v) => {
      if (filter === "ONGOING" && v.executed) return false;
      if (filter === "DONE" && !v.executed) return false;
      if (filter === "GRANT" && v.isDevote) return false;
      if (filter === "DEVOTE" && !v.isDevote) return false;
      if (!s) return true;
      const hay = [
        v.candidate,
        v.candidateUser?.name,
        v.candidateUser?.username,
        v.grantedByUser?.name,
        v.grantedByUser?.username,
        String(v.voteId),
        v.roleToTarget,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(s);
    });
  }, [rows, filter, debounced]);

  const flashing = useBriefLoading(`${filter}|${debounced}|${page}`);

  type VoteRow = (typeof rows)[number];
  const columns: ColumnDef<VoteRow, unknown>[] = [
    {
      id: "id",
      header: "ID",
      cell: ({ row }) => (
        <span className="font-semibold">#{row.original.voteId}</span>
      ),
    },
    {
      id: "jenis",
      header: "JENIS",
      cell: ({ row }) => (
        <Badge
          variant={row.original.isDevote ? "destructive" : "default"}
          className="rounded-sm"
        >
          {row.original.isDevote ? "Devote" : "Grant"}
        </Badge>
      ),
    },
    {
      id: "role",
      header: "ROLE",
      cell: ({ row }) => (
        <Badge variant="secondary" className="rounded-sm">
          {row.original.roleToTarget}
        </Badge>
      ),
    },
    {
      id: "kandidat",
      header: "KANDIDAT",
      cell: ({ row }) => (
        <UserCell
          user={row.original.candidateUser}
          wallet={row.original.candidate}
        />
      ),
    },
    {
      id: "diajukan-oleh",
      header: "DIAJUKAN OLEH",
      cell: ({ row }) => (
        <UserCell
          user={row.original.grantedByUser}
          wallet={row.original.grantedBy}
        />
      ),
    },
    {
      id: "status",
      header: "STATUS",
      cell: ({ row }) => {
        
        const count = row.original.voteCount;
        if (row.original.executed) {
          return (
            <Badge variant="success" className="rounded-sm">
              Berhasil · {count}/{impliedTotalFromThreshold(count)}
            </Badge>
          );
        }
        return (
          <Badge variant="secondary" className="rounded-sm">
            {count} suara
          </Badge>
        );
      },
    },
  ];

  return (
    <ListShell max="max-w-5xl">
      <PageHeader
        eyebrow="Governance"
        title="Voting Perubahan Peran"
        gradient
        subtitle="Transparansi voting BFT admin untuk perubahan peran struktural. Ambang ⌊2N/3⌋+1."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <FilterTabs
          items={FILTERS as unknown as { key: string; label: string }[]}
          value={filter}
          onChange={(k) => {
            setFilter(k);
            setPage(1);
          }}
        />
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Cari kandidat / #ID…"
          className="sm:ml-auto sm:max-w-xs"
        />
      </div>

      <QueryState
        isLoading={q.isLoading || flashing}
        isError={q.isError}
        error={q.error}
        isEmpty={filtered.length === 0}
        onRetry={q.refetch}
        emptyIcon={<Gavel />}
        emptyTitle="Belum ada voting peran"
        emptyDescription="Voting perubahan peran akan muncul di sini."
      >
        <Reveal>
          <DataTable
            columns={columns}
            data={filtered}
            minWidth={820}
            onRowClick={(v) => navigate(`/governance/votes/${v.voteId}`)}
          />
        </Reveal>
      </QueryState>
      <Paginator page={page} totalPages={totalPages} onChange={setPage} />
    </ListShell>
  );
}