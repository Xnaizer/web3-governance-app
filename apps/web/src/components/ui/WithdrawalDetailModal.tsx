import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExternalLink, ImageOff } from "lucide-react";
import {
  formatIDR,
  formatDate,
  formatShortenAddress,
} from "../../utils/format";
import { ZoomableImage } from "./Lightbox";
import type { Withdrawal } from "../../types/program";

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <span className="break-all text-sm">{value ?? "—"}</span>
    </div>
  );
}

export function WithdrawalDetailModal({
  w,
  isOpen,
  onClose,
}: {
  w: Withdrawal | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-lg overflow-hidden rounded-2xl p-0">
        <DialogHeader className="border-b border-black/5 px-6 py-4">
          <DialogTitle className="font-display tracking-tight">
            Detail Penarikan
          </DialogTitle>
        </DialogHeader>
        {w && (
          <div className="flex max-h-[75vh] flex-col gap-5 overflow-y-auto px-6 pb-6">
            <div className="rounded-2xl bg-linear-to-br from-brand-mint/12 to-brand-blue/12 p-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Jumlah
              </p>
              <p className="mt-1 font-display text-2xl font-semibold tracking-tight text-brand-blue sm:text-3xl">
                {formatIDR(w.amount)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDate(w.timestamp)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Row label="Penerima" value={w.recipientName} />
              <Row
                label="Tx Hash"
                value={
                  w.txHash ? (
                    <a
                      href={`https://sepolia.basescan.org/tx/${w.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-brand-blue hover:underline"
                    >
                      {formatShortenAddress(w.txHash)}{" "}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
            </div>

            {w.description && <Row label="Deskripsi" value={w.description} />}

            <div>
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Bukti / Receipt
              </span>
              {w.receiptUrl ? (
                <ZoomableImage
                  src={w.receiptUrl}
                  alt="Receipt"
                  className="max-h-80 w-full object-contain bg-muted/30 transition-transform duration-300"
                  wrapperClassName="mt-2 block overflow-hidden rounded-xl border border-black/5"
                />
              ) : (
                <div className="mt-2 flex flex-col items-center gap-2 rounded-xl border border-dashed border-black/10 py-8 text-center">
                  <ImageOff className="h-6 w-6 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    Belum ada foto receipt
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}