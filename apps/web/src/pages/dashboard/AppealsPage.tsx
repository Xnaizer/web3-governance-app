import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Scale } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { useProgramsByStatus } from "../../hooks/useProgramsByStatus";
import { useVoteUnfreeze } from "../../hooks/useVoteUnfreeze";
import {
  useValidatorThreshold,
  useUnfreezeAppealVotes,
} from "../../hooks/useGovReads";
import { useMyActivity } from "../../hooks/useMyActivity";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { PageHeader } from "../../components/ui/PageHeader";
import { QueryState } from "../../components/ui/QueryState";
import { BrandLoader } from "../../components/ui/BrandLoader";
import { FilterTabs } from "../../components/ui/FilterTabs";
import { SearchInput } from "../../components/ui/SearchInput";
import { DataTable } from "../../components/ui/DataTable";
import { UserCell, MissingUser } from "../../components/UserCell";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatIDR, formatDate } from "../../utils/format";
import type { ProgramListItem } from "../../types/program";

function MyUnfreezeVotes() {
  const { data, isLoading, isError, refetch } = useMyActivity();
  const ballots = data?.unfreezeBallots ?? [];
  return (
    <Card className="rounded-2xl border-black/5 shadow-none">
      <CardHeader className="flex-row items-center gap-2 space-y-0 font-display font-semibold tracking-tight">
        <Scale className="h-4 w-4 text-brand-blue" />
        Banding yang Saya Vote
        <Badge variant="secondary" className="ml-auto rounded-sm">
          {ballots.length}
        </Badge>
      </CardHeader>
      <CardContent>
        <QueryState
          skeleton={<BrandLoader />}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          isEmpty={ballots.length === 0}
          emptyIcon={<Scale />}
          emptyTitle="Belum ada suara banding"
          emptyDescription="Suara Anda pada banding unfreeze tercatat di sini. (Vote proposal tidak disimpan per-voter.)"
        >
          <div className="flex flex-col">
            {ballots.map((b, i) => (
              <div
                key={i}
                className="flex flex-wrap items-center gap-2 border-b border-black/5 py-2.5 text-sm last:border-0"
              >
                <Link
                  to={`/programs/${b.unfreezeVote.programId}`}
                  className="flex min-w-0 items-center gap-2"
                >
                  <span className="font-mono text-xs text-muted-foreground">
                    #{b.unfreezeVote.programId}
                  </span>
                  <span className="truncate font-display font-medium tracking-tight hover:text-brand-blue">
                    {b.unfreezeVote.program?.title ?? "(tanpa judul)"}
                  </span>
                </Link>
                <Badge
                  variant={b.approve ? "success" : "destructive"}
                  className="rounded-sm"
                >
                  {b.approve ? "Setuju unfreeze" : "Tolak (dukung fraud)"}
                </Badge>
                <Badge
                  variant={b.unfreezeVote.resolved ? "secondary" : "warning"}
                  className="rounded-sm"
                >
                  {b.unfreezeVote.resolved ? "Selesai" : "Berjalan"}
                </Badge>
                <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">
                  {formatDate(b.votedAt)}
                </span>
              </div>
            ))}
          </div>
        </QueryState>
      </CardContent>
    </Card>
  );
}

function isAnomaly(p: ProgramListItem): boolean {
  return p.isOrphan || !p.pic || p.integrity !== "VERIFIED";
}

function AppealVoteCell({
  programId,
  threshold,
}: {
  programId: number;
  threshold: number;
}) {
  const { approve, reject } = useUnfreezeAppealVotes(programId);
  const tot = approve + reject || 1;
  return (
    <div className="min-w-36">
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="text-emerald-600">Setuju {approve}</span>
        <span className="text-destructive">Tolak {reject}</span>
      </div>
      <div className="mt-1 flex h-1.5 w-full overflow-hidden rounded-sm bg-muted">
        <span
          className="bg-emerald-500"
          style={{ width: `${(approve / tot) * 100}%` }}
        />
        <span
          className="bg-destructive"
          style={{ width: `${(reject / tot) * 100}%` }}
        />
      </div>
      <p className="mt-0.5 text-[10px] text-muted-foreground">
        ambang {threshold}
      </p>
    </div>
  );
}

function AppealBtns({ p }: { p: ProgramListItem }) {
  const { vote, busy } = useVoteUnfreeze(p.programId);
  const [open, setOpen] = useState(false);
  const [approve, setApprove] = useState(true);

  const openDlg = (a: boolean) => {
    setApprove(a);
    setOpen(true);
  };
  const confirm = async () => {
    const pr = vote(approve);
    toast.promise(pr, {
      loading: "Mengirim vote…",
      success: "Vote terkirim.",
      error: (e) => (e as Error)?.message ?? "Gagal",
    });
    try {
      await pr;
      setOpen(false);
    } catch {}
  };

  return (
    <>
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="secondary"
          className="text-emerald-600"
          onClick={() => openDlg(true)}
        >
          Setuju
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="text-destructive"
          onClick={() => openDlg(false)}
        >
          Tolak
        </Button>
      </div>
      <ConfirmDialog
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={confirm}
        isLoading={busy}
        title={
          approve
            ? `Setujui unfreeze #${p.programId}?`
            : `Tolak banding #${p.programId}?`
        }
        confirmLabel={
          approve ? "Ya, setujui unfreeze" : "Ya, tolak (dukung fraud)"
        }
        confirmColor={approve ? "success" : "danger"}
        warnings={
          approve
            ? [
                "Menyetujui = menyatakan PIC TIDAK terbukti bersalah; program kembali ke status DRAWABLE.",
                "Vote bersifat FINAL dan tidak bisa dibatalkan setelah masuk blockchain.",
              ]
            : [
                "Menolak = MENDUKUNG tuduhan fraud terhadap PIC.",
                "Bila ambang tercapai, program menjadi FRAUD_CONFIRMED — status final & PERMANEN, pencairan diblokir selamanya.",
                "Vote bersifat FINAL dan tidak bisa dibatalkan.",
              ]
        }
      />
    </>
  );
}

export function AppealsPage() {
  const { data, isLoading, isError, error, refetch } = useProgramsByStatus([
    "FROZEN",
  ]);
  const { threshold } = useValidatorThreshold();
  const [tab, setTab] = useState<string>("VALID");
  const [search, setSearch] = useState("");

  const { valid, anomaly } = useMemo(() => {
    const valid: ProgramListItem[] = [];
    const anomaly: ProgramListItem[] = [];
    (data ?? []).forEach((p) => (isAnomaly(p) ? anomaly : valid).push(p));
    return { valid, anomaly };
  }, [data]);

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
      header: "SUARA BANDING",
      cell: ({ row }) => (
        <AppealVoteCell
          programId={row.original.programId}
          threshold={threshold}
        />
      ),
    },
    {
      id: "aksi",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          <Button asChild size="sm" variant="ghost">
            <Link to={`/programs/${row.original.programId}`}>Detail</Link>
          </Button>
          {isAnomaly(row.original) ? (
            <span className="whitespace-nowrap text-[11px] text-amber-600">
              tinjau dulu
            </span>
          ) : (
            <AppealBtns p={row.original} />
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Validator"
        title="Banding Unfreeze"
        gradient
        subtitle="Program FROZEN dengan banding aktif. Approve = bebaskan; Reject = kukuhkan fraud."
      />

      <Tabs defaultValue="queue">
        <TabsList className="rounded-lg bg-muted p-1">
          <TabsTrigger value="queue">Banding</TabsTrigger>
          <TabsTrigger value="mine">Yang Saya Vote</TabsTrigger>
        </TabsList>

        <TabsContent value="queue">
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <FilterTabs
                items={
                  [
                    { key: "VALID", label: `Banding (${valid.length})` },
                    { key: "ANOMALY", label: `Anomali (${anomaly.length})` },
                  ] as unknown as { key: string; label: string }[]
                }
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

            <QueryState
              skeleton={<BrandLoader />}
              isLoading={isLoading}
              isError={isError}
              error={error}
              isEmpty={shown.length === 0}
              onRetry={refetch}
              emptyTitle={
                tab === "ANOMALY"
                  ? "Tidak ada banding anomali"
                  : "Tidak ada program beku"
              }
              emptyDescription={
                tab === "ANOMALY"
                  ? "Program beku tanpa PIC terdaftar / orphan akan dipisahkan ke sini."
                  : "Banding unfreeze yang menunggu suara Anda akan muncul di sini."
              }
            >
              <DataTable columns={columns} data={shown} minWidth={860} />
            </QueryState>
          </div>
        </TabsContent>

        <TabsContent value="mine">
          <div className="pt-2">
            <MyUnfreezeVotes />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
