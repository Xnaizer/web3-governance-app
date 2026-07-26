import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "../../ui/ConfirmButton";
import { RowAvatar } from "./RowAvatar";
import { useGrantPic } from "../../../hooks/useAdmin";
import { formatShortenAddress } from "../../../utils/format";
import type { AdminUser } from "../../../services/usersApi";

export function PicGrantRow({
  u,
  onDetail,
}: {
  u: AdminUser;
  onDetail: (id: string) => void;
}) {
  const { grant } = useGrantPic();
  const wallet = u.walletAddress;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-black/5 py-2.5 last:border-0">
      <RowAvatar u={u} />
      <div className="min-w-0 flex-1 text-sm">
        <button
          type="button"
          onClick={() => onDetail(u.id)}
          className="font-semibold text-brand-blue hover:underline"
        >
          {u.name ?? u.username}
        </button>{" "}
        {wallet ? (
          <span className="font-mono text-xs text-muted-foreground">
            {formatShortenAddress(wallet)}
          </span>
        ) : (
          <Badge variant="secondary" className="rounded-sm">
            tanpa wallet
          </Badge>
        )}
        {u.isVerified ? (
          <Badge variant="success" className="ml-2 rounded-sm">
            verified
          </Badge>
        ) : (
          <Badge variant="warning" className="ml-2 rounded-sm">
            unverified
          </Badge>
        )}
      </div>

      <Button
        size="sm"
        variant={u.isVerified ? "ghost" : "secondary"}
        onClick={() => onDetail(u.id)}
      >
        {u.isVerified ? "Lihat detail" : "Detail & Verifikasi"}
      </Button>

      {u.isVerified && wallet && (
        <ConfirmButton
          triggerLabel="Grant PIC"
          triggerProps={{ size: "sm", color: "primary", variant: "flat" }}
          title={`Beri PIC_ROLE ke ${u.name ?? u.username}?`}
          confirmLabel="Ya, grant PIC"
          toasts={{ loading: "Grant PIC…", success: "PIC diberikan." }}
          action={() => grant(wallet)}
          warnings={[
            "Aksi tercatat on-chain dan tidak bisa dibatalkan (hanya bisa di-revoke terpisah).",
            "Wallet ini akan diizinkan submit proposal pendanaan langsung ke kontrak.",
            "Hanya untuk user tanpa peran lain (kontrak menolak double-grant).",
          ]}
        />
      )}
      {u.isVerified && !wallet && (
        <Badge variant="warning" className="rounded-sm">
          user belum bind wallet
        </Badge>
      )}
    </div>
  );
}

export function PicActiveRow({
  u,
  onDetail,
}: {
  u: AdminUser;
  onDetail: (id: string) => void;
}) {
  const { revoke } = useGrantPic();
  const wallet = u.walletAddress!;
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-black/5 py-2.5 last:border-0">
      <RowAvatar u={u} />
      <div className="min-w-0 flex-1 text-sm">
        <button
          type="button"
          onClick={() => onDetail(u.id)}
          className="font-semibold text-brand-blue hover:underline"
        >
          {u.name ?? u.username}
        </button>{" "}
        <span className="font-mono text-xs text-muted-foreground">
          {formatShortenAddress(wallet)}
        </span>
        <Badge className="ml-2 rounded-sm">PIC</Badge>
      </div>
      <Button size="sm" variant="ghost" onClick={() => onDetail(u.id)}>
        Lihat detail
      </Button>
      <ConfirmButton
        triggerLabel="Revoke PIC"
        triggerProps={{ size: "sm", color: "danger", variant: "light" }}
        title={`Cabut PIC_ROLE dari ${u.name ?? u.username}?`}
        confirmLabel="Ya, revoke PIC"
        confirmColor="danger"
        toasts={{ loading: "Revoke PIC…", success: "PIC dicabut." }}
        action={() => revoke(wallet)}
        warnings={[
          "Aksi tercatat on-chain dan tidak bisa dibatalkan.",
          "Wallet tidak lagi bisa submit proposal baru setelah dicabut.",
        ]}
      />
    </div>
  );
}

