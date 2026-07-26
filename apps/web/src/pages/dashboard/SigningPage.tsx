import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { TriangleAlert, ShieldCheck } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { QueryState } from "../../components/ui/QueryState";
import { BrandLoader } from "../../components/ui/BrandLoader";
import { SearchInput } from "../../components/ui/SearchInput";
import { FilterTabs } from "../../components/ui/FilterTabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { cn } from "@/utils/cn";
import { useProgramsByStatus } from "../../hooks/useProgramsByStatus";
import { getProgramDetailAuthed } from "../../services/programApi";
import { useSignatures } from "../../hooks/useSignatures";
import { useSignMilestone } from "../../hooks/useSignMilestone";
import { useMe } from "../../hooks/useAuth";
import { getErrorMessage } from "../../utils/error";
import type { SignerRole } from "../../types/common";

const HEAD =
  "h-11 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground";

function SignRow({ programId }: { programId: number }) {
  const { data: me } = useMe();
  const { data: p, isLoading } = useQuery({
    queryKey: ["program-authed", programId],
    queryFn: () => getProgramDetailAuthed(programId),
  });
  const milestone = p?.milestones.find(
    (m) => m.milestoneIndex === p.currentMilestone,
  );
  const sigs = useSignatures(milestone?.id);
  const sign = useSignMilestone();
  const [open, setOpen] = useState(false);

  if (isLoading || !p) {
    return (
      <TableRow className="border-black/5">
        <TableCell className="px-4 py-3">
          <Skeleton className="h-4 w-40" />
        </TableCell>
        <TableCell className="px-4 py-3">
          <Skeleton className="h-4 w-14" />
        </TableCell>
        <TableCell className="px-4 py-3">
          <Skeleton className="h-2 w-20 rounded-full" />
        </TableCell>
        <TableCell className="px-4 py-3">
          <Skeleton className="h-5 w-16 rounded-md" />
        </TableCell>
        <TableCell className="px-4 py-3">
          <Skeleton className="ml-auto h-8 w-28 rounded-md" />
        </TableCell>
      </TableRow>
    );
  }

  const role = me?.role as SignerRole;
  const signable = !!milestone && milestone.status === "PLANNED";
  const alreadySigned =
    sigs.data?.signatures.some((s) => s.signerRole === role) ?? false;
  const hasEvidence = !!milestone?.evidenceHash;
  const canSign = signable && hasEvidence && !alreadySigned;
  const collected = sigs.data?.collected ?? 0;

  const onTrigger = () => {
    if (!signable) {
      toast.error(
        "Tidak ada milestone berstatus PLANNED untuk ditandatangani.",
      );
      return;
    }
    if (alreadySigned) {
      toast.error("Anda sudah menandatangani milestone ini.");
      return;
    }
    if (!hasEvidence) {
      toast.error(
        "PIC belum mengunggah dokumen bukti — belum bisa ditandatangani.",
      );
      return;
    }
    setOpen(true);
  };

  const confirm = async () => {
    if (!milestone) return;
    const pr = sign.mutateAsync({
      milestoneId: milestone.id,
      programId: p.programId,
      milestoneIndex: milestone.milestoneIndex,
      milestoneBudget: milestone.milestoneBudget,
      evidenceHash: milestone.evidenceHash!,
      signerRole: role,
    });
    toast.promise(pr, {
      loading: "Menandatangani…",
      success: "Tanda tangan terkirim.",
      error: (e) => getErrorMessage(e),
    });
    try {
      await pr;
      setOpen(false);
    } catch {
      
    }
  };

  return (
    <TableRow className="border-black/5">
      <TableCell className="px-4 py-3">
        <Link
          to={`/programs/${p.programId}`}
          className="flex items-center gap-2"
        >
          <span className="font-mono text-xs text-muted-foreground">
            #{p.programId}
          </span>
          <span className="max-w-55 truncate font-display font-medium tracking-tight hover:text-brand-blue">
            {p.title ?? "(tanpa judul)"}
          </span>
        </Link>
      </TableCell>
      <TableCell className="px-4 py-3">
        {milestone ? (
          <div className="flex max-w-64 flex-col gap-1">
            <span className="font-mono text-sm">
              #{milestone.milestoneIndex + 1}
            </span>
            {milestone.description && (
              <span className="truncate text-xs text-muted-foreground">
                {milestone.description}
              </span>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="px-4 py-3">
        {signable ? (
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={cn(
                    "h-2 w-6 rounded-full",
                    i < collected ? "bg-brand-blue" : "bg-muted",
                  )}
                />
              ))}
            </div>
            <span className="font-mono text-xs text-muted-foreground">
              {collected}/3
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">
            tidak ada milestone PLANNED
          </span>
        )}
      </TableCell>
      <TableCell className="px-4 py-3">
        {signable ? (
          <Badge
            variant={hasEvidence ? "success" : "warning"}
            className="rounded-sm"
          >
            {hasEvidence ? "bukti ada" : "bukti belum"}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          <Button asChild size="sm" variant="ghost">
            <Link to={`/programs/${p.programId}`}>Detail</Link>
          </Button>
          {alreadySigned ? (
            <Button
              size="sm"
              variant="secondary"
              className="text-emerald-600"
              disabled
            >
              Sudah ✓
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={onTrigger}
              disabled={sign.isPending || !signable}
              title={!signable ? "Tidak ada milestone PLANNED" : undefined}
            >
              {sign.isPending && <Spinner size={16} className="text-current" />}
              Tanda Tangani
            </Button>
          )}
        </div>
      </TableCell>

      <ConfirmDialog
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={confirm}
        isLoading={sign.isPending}
        title={`Tanda tangani milestone #${
          (milestone?.milestoneIndex ?? 0) + 1
        }?`}
        confirmLabel="Ya, tanda tangani"
        confirmDisabled={!canSign}
        checkboxLabel="Saya telah memeriksa dokumen bukti dan setuju menandatanganinya."
        warnings={[
          "Tanda tangan Anda MENGIKAT ke dokumen bukti pertama dan TIDAK bisa di-overwrite.",
          "Set tanda tangan hanya bisa direset oleh PIC saat milestone masih PLANNED.",
          "Menandatangani = menyetujui pencairan sesuai bukti & anggaran milestone ini.",
        ]}
      />
    </TableRow>
  );
}

const STATUS_TABS = [
  { key: "ALL", label: "Semua" },
  { key: "APPROVED", label: "Approved" },
  { key: "MILESTONE_ACHIEVED", label: "Milestone Selesai" },
] as const;

export function SigningPage() {
  const { data, isLoading, isError, error, refetch } = useProgramsByStatus([
    "APPROVED",
    "MILESTONE_ACHIEVED",
  ]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("ALL");
  const filtered = (data ?? []).filter((p) => {
    if (status !== "ALL" && p.status !== status) return false;
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return (
      String(p.programId).includes(s) ||
      (p.title ?? "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Signer"
        title="Tanda Tangan Milestone"
        gradient
        subtitle="Tanda tangani milestone aktif (EIP-712). Butuh 1 ADMIN + 1 VALIDATOR + 1 AUDITOR."
      />

    
      <div className="flex items-start gap-3 rounded-2xl border border-brand-blue/20 bg-brand-blue/5 p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-blue" />
        <p className="text-sm text-muted-foreground">
          Tanda tangan bersifat{" "}
          <b className="text-foreground">mengikat & final</b> — terikat ke
          dokumen bukti pertama dan tak bisa di-overwrite. Auditor yang sama tak
          boleh menandatangani dua milestone berbeda pada program yang sama.
          Periksa dokumen dengan teliti sebelum menandatangani.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <FilterTabs
          items={STATUS_TABS as unknown as { key: string; label: string }[]}
          value={status}
          onChange={setStatus}
        />
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Cari judul atau #ID program…"
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
        emptyIcon={<TriangleAlert />}
        emptyTitle="Tidak ada program aktif"
        emptyDescription="Program APPROVED/MILESTONE SELESAI akan muncul di sini saat siap ditandatangani."
      >
        <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white">
          <Table style={{ minWidth: 760 }}>
            <TableHeader>
              <TableRow className="border-black/5 bg-muted/40 hover:bg-muted/40">
                <TableHead className={HEAD}>Program</TableHead>
                <TableHead className={HEAD}>Milestone</TableHead>
                <TableHead className={HEAD}>Progres</TableHead>
                <TableHead className={HEAD}>Bukti</TableHead>
                <TableHead className={cn(HEAD, "text-right")}>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <SignRow key={p.programId} programId={p.programId} />
              ))}
            </TableBody>
          </Table>
        </div>
      </QueryState>
    </div>
  );
}