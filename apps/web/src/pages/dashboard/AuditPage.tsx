import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Snowflake } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { useProgramsByStatus } from "../../hooks/useProgramsByStatus";
import { useFreezeProgram } from "../../hooks/useFreezeProgram";
import { useMyActivity } from "../../hooks/useMyActivity";
import { submitFreezeEvidence } from "../../services/freezeApi";
import { getErrorMessage } from "../../utils/error";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatIDR, formatDate } from "../../utils/format";
import type { ProgramListItem } from "../../types/program";

function MyFreezes() {
  const { data, isLoading, isError, refetch } = useMyActivity();
  const freezes = data?.freezes ?? [];
  return (
    <Card className="rounded-2xl border-black/5 shadow-none">
      <CardHeader className="flex-row items-center gap-2 space-y-0 font-display font-semibold tracking-tight">
        <Snowflake className="h-4 w-4 text-amber-600" />
        Program yang Saya Bekukan
        <Badge variant="secondary" className="ml-auto rounded-sm">
          {freezes.length}
        </Badge>
      </CardHeader>
      <CardContent>
        <QueryState
          skeleton={<BrandLoader />}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          isEmpty={freezes.length === 0}
          emptyIcon={<Snowflake />}
          emptyTitle="Belum ada program yang dibekukan"
          emptyDescription="Program yang Anda bekukan akan tercatat di sini sebagai jejak akuntabilitas."
        >
          <div className="flex flex-col">
            {freezes.map((f) => (
              <div
                key={f.programId}
                className="flex flex-wrap items-center gap-2 border-b border-black/5 py-2.5 text-sm last:border-0"
              >
                <Link
                  to={`/programs/${f.programId}`}
                  className="flex min-w-0 items-center gap-2"
                >
                  <span className="font-mono text-xs text-muted-foreground">
                    #{f.programId}
                  </span>
                  <span className="truncate font-display font-medium tracking-tight hover:text-brand-blue">
                    {f.program?.title ?? "(tanpa judul)"}
                  </span>
                </Link>
                <Badge
                  variant={
                    f.outcome === "FRAUD_PROVEN"
                      ? "destructive"
                      : f.outcome === "PENDING"
                      ? "warning"
                      : "secondary"
                  }
                  className="rounded-sm"
                >
                  {f.outcome}
                </Badge>
                {f.program && (
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatIDR(f.program.totalBudget)}
                  </span>
                )}
                <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">
                  {formatDate(f.frozenAt)}
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

function FreezeBtn({ p }: { p: ProgramListItem }) {
  const { freeze, busy, state } = useFreezeProgram(p.programId);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");

  const confirm = async () => {
    const fr = freeze();
    toast.promise(fr, {
      loading: "Membekukan…",
      success: "Program dibekukan.",
      error: (e) => (e as Error)?.message ?? "Gagal",
    });
    try {
      await fr;
      try {
        await submitFreezeEvidence(p.programId, {
          reason,
          description: description.trim() || undefined,
          evidenceUrl: evidenceUrl.trim() || undefined,
        });
      } catch (e) {
        toast.error(
          `Program dibekukan, tapi bukti gagal tersimpan: ${getErrorMessage(
            e,
          )}`,
        );
      }
      setOpen(false);
    } catch {
     
    }
  };

  return (
    <>
      <Button
        size="sm"
        className="bg-amber-600 text-white hover:bg-amber-600/90"
        onClick={() => setOpen(true)}
      >
        Bekukan
      </Button>
      {state === "syncing" && (
        <span className="ml-2 text-xs text-amber-600">menunggu webhook…</span>
      )}
      <ConfirmDialog
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={confirm}
        isLoading={busy}
        title={`Bekukan program #${p.programId}?`}
        confirmLabel="Ya, bekukan program"
        confirmColor="danger"
        confirmDisabled={reason.trim().length === 0}
        checkboxLabel="Saya bertanggung jawab atas pembekuan ini dan telah menyiapkan bukti."
        warnings={[
          "Pembekuan menghentikan SELURUH pencairan dana seketika (status → FROZEN).",
          "Jika PIC ternyata TIDAK bersalah (banding disetujui validator), reputasi Anda sebagai auditor akan TURUN (FALSE_FREEZE) dan Anda menjadi penanggung jawab pembekuan ini.",
          "PIC berhak mengajukan banding — voting unfreeze dua arah selama 7 hari.",
          "Alasan & bukti Anda tersimpan sebagai catatan akuntabilitas dan tampil publik.",
        ]}
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>
              Alasan pembekuan <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ringkas indikasi kecurangan (mis. penarikan tak wajar)…"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Uraian detail (opsional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail temuan, kronologi, atau angka pendukung…"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Tautan bukti (opsional)</Label>
            <Input
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="URL dokumen/arsip bukti (mis. Google Drive, IPFS)"
            />
            <p className="text-xs text-muted-foreground">
              URL dokumen/arsip bukti (mis. Google Drive, IPFS).
            </p>
          </div>
        </div>
      </ConfirmDialog>
    </>
  );
}

export function AuditPage() {
  const { data, isLoading, isError, error, refetch } = useProgramsByStatus([
    "DRAWABLE",
  ]);
  const [tab, setTab] = useState<string>("VALID");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (data ?? []).filter((p) => {
      const anomaly = isAnomaly(p);
      if (tab === "ANOMALY" ? !anomaly : anomaly) return false;
      if (!s) return true;
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
  }, [data, tab, search]);

  const counts = useMemo(() => {
    let valid = 0;
    let anomaly = 0;
    (data ?? []).forEach((p) => (isAnomaly(p) ? anomaly++ : valid++));
    return { valid, anomaly };
  }, [data]);

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
      id: "milestone",
      header: "MILESTONE",
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {row.original.currentMilestone}/{row.original.milestoneCount}
        </span>
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
          <FreezeBtn p={row.original} />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Auditor"
        title="Freeze / Audit"
        gradient
        subtitle="Hanya program DRAWABLE yang bisa dibekukan (guard on-chain)."
      />

      <Tabs defaultValue="queue">
        <TabsList className="rounded-lg bg-muted p-1">
          <TabsTrigger value="queue">Audit</TabsTrigger>
          <TabsTrigger value="mine">Yang Saya Bekukan</TabsTrigger>
        </TabsList>

        <TabsContent value="queue">
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <FilterTabs
                items={
                  [
                    { key: "VALID", label: `Bisa Dibekukan (${counts.valid})` },
                    { key: "ANOMALY", label: `Anomali (${counts.anomaly})` },
                  ] as unknown as { key: string; label: string }[]
                }
                value={tab}
                onChange={(k) => setTab(k)}
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
              isEmpty={filtered.length === 0}
              onRetry={refetch}
              emptyTitle={
                tab === "ANOMALY"
                  ? "Tidak ada program anomali"
                  : "Tidak ada program DRAWABLE"
              }
              emptyDescription={
                tab === "ANOMALY"
                  ? "Program DRAWABLE tanpa PIC terdaftar / orphan akan dipisahkan ke sini."
                  : "Program yang sedang mencairkan dana akan muncul di sini."
              }
            >
              <DataTable columns={columns} data={filtered} minWidth={760} />
            </QueryState>
          </div>
        </TabsContent>

        <TabsContent value="mine">
          <div className="pt-2">
            <MyFreezes />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
