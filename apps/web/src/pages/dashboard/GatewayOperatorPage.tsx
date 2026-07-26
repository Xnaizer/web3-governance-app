import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "../../components/ui/PageHeader";
import { QueryState } from "../../components/ui/QueryState";
import { ConfirmButton } from "../../components/ui/ConfirmButton";
import { UserCell } from "../../components/UserCell";
import { RedemptionStatusChip } from "../../components/RedemptionStatusChip";
import { RedemptionStatsCards } from "../../components/RedemptionStatsCards";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BrandLoader } from "@/components/ui/BrandLoader";
import { useGatewayOwner } from "../../hooks/useGatewayOwner";
import { useRedemptions, useRedemptionStats } from "../../hooks/useRedemptions";
import {
  useConfirmRedemption,
  useCancelRedemption,
} from "../../hooks/useGatewayActions";
import {
  formatIDR,
  formatDate,
  formatShortenAddress,
} from "../../utils/format";
import type { RedemptionRow } from "../../types/redemption";

function PendingRow({ r }: { r: RedemptionRow }) {
  const qc = useQueryClient();
  const confirmTx = useConfirmRedemption(r.redemptionId);
  const cancelTx = useCancelRedemption(r.redemptionId);

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["redemptions"] });
    await qc.invalidateQueries({ queryKey: ["redemption-stats"] });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-black/5 py-3 text-sm last:border-0">
      <span className="font-mono text-muted-foreground">#{r.redemptionId}</span>
      <UserCell user={r.pic} wallet={r.picWallet} />
      <span className="font-mono font-medium">{formatIDR(r.amount)}</span>
      <span className="text-xs text-muted-foreground">
        {formatDate(r.requestedAt)}
      </span>

      <div className="ml-auto flex items-center gap-2">
        {confirmTx.syncPending || cancelTx.syncPending ? (
          <span className="text-xs text-amber-600">menunggu webhook…</span>
        ) : null}
        <ConfirmButton
          triggerLabel="Konfirmasi (burn+fiat)"
          triggerProps={{
            size: "sm",
            color: "success",
            variant: "flat",
            isLoading: confirmTx.busy,
          }}
          title={`Konfirmasi penukaran #${r.redemptionId}?`}
          confirmLabel="Ya, sudah bayar fiat — bakar token"
          confirmColor="success"
          checkboxLabel="Saya memastikan Rupiah fisik SUDAH dicairkan ke PIC."
          toasts={{
            loading: "Membakar escrow…",
            success: "Penukaran diselesaikan (SETTLED).",
          }}
          action={async () => {
            await confirmTx.confirm();
            await refresh();
          }}
          warnings={[
            "Token escrow akan DIBAKAR permanen dan penukaran ditandai SETTLED.",
            "Lakukan HANYA setelah Rupiah fisik benar-benar dibayarkan ke PIC — aksi tak bisa dibatalkan.",
          ]}
        />
        <ConfirmButton
          triggerLabel="Batalkan (refund)"
          triggerProps={{
            size: "sm",
            color: "danger",
            variant: "light",
            isLoading: cancelTx.busy,
          }}
          title={`Batalkan penukaran #${r.redemptionId}?`}
          confirmLabel="Ya, kembalikan token ke PIC"
          confirmColor="danger"
          toasts={{
            loading: "Mengembalikan escrow…",
            success: "Penukaran dibatalkan, token kembali ke PIC.",
          }}
          action={async () => {
            await cancelTx.cancel();
            await refresh();
          }}
          warnings={[
            "Token escrow dikembalikan ke wallet PIC dan penukaran ditandai CANCELLED.",
            "Lakukan bila fiat TIDAK jadi dicairkan.",
          ]}
        />
      </div>
    </div>
  );
}

export function GatewayOperatorPage() {
  const { owner, isOperator, isLoading } = useGatewayOwner();
  const pendingQ = useRedemptions("PENDING");
  const statsQ = useRedemptionStats();
  const stats = statsQ.data;
  const pendingRows = pendingQ.data?.rows ?? [];

  if (isLoading) return <BrandLoader />;

  if (!isOperator) {
    return (
      <>
        <PageHeader
          eyebrow="Gateway"
          title="Gateway (Operator)"
          gradient
          subtitle="Kelola penyelesaian penukaran token."
        />
        <Card className="max-w-lg rounded-2xl border-amber-400 shadow-none">
          <CardContent className="flex flex-col gap-2 p-4 text-sm">
            <p className="font-semibold text-amber-600">Akses operator saja</p>
            <p className="text-muted-foreground">
              Halaman ini hanya untuk <b>operator gateway</b> (wallet{" "}
              <span className="font-mono">gatewayOwner</span>). Hubungkan wallet
              operator di kanan atas.
            </p>
            {owner && (
              <Badge variant="secondary" className="w-fit font-mono">
                operator: {formatShortenAddress(owner)}
              </Badge>
            )}
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Gateway"
        title="Gateway (Operator)"
        gradient
        subtitle="Selesaikan penukaran: konfirmasi (burn + fiat) atau batalkan (refund)."
      />

      {stats && <RedemptionStatsCards stats={stats} />}

      <Card className="rounded-2xl border-black/5 shadow-none">
        <CardHeader className="flex-row items-center justify-between space-y-0 font-display font-semibold tracking-tight">
          <span>Penukaran Menunggu</span>
          <RedemptionStatusChip status="PENDING" />
        </CardHeader>
        <CardContent className="flex flex-col">
          <QueryState
            isLoading={pendingQ.isLoading}
            isError={pendingQ.isError}
            error={pendingQ.error}
            isEmpty={pendingRows.length === 0}
            onRetry={pendingQ.refetch}
            emptyTitle="Tidak ada penukaran menunggu"
            emptyDescription="Permintaan penukaran dari PIC akan muncul di sini."
          >
            {pendingRows.map((r) => (
              <PendingRow key={r.id} r={r} />
            ))}
          </QueryState>
        </CardContent>
      </Card>
    </div>
  );
}
