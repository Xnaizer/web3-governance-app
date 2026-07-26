import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "../../components/ui/PageHeader";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { ConfirmButton } from "../../components/ui/ConfirmButton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/utils/cn";
import {
  useRedeemToken,
  type RedemptionStatus,
} from "../../hooks/useRedeemToken";
import { formatIDR } from "../../utils/format";
import { getErrorMessage } from "../../utils/error";

const STATUS_VARIANT: Record<
  RedemptionStatus,
  "warning" | "success" | "secondary"
> = {
  NONE: "secondary",
  PENDING: "warning",
  SETTLED: "success",
  CANCELLED: "secondary",
};
const STATUS_LABEL: Record<RedemptionStatus, string> = {
  NONE: "-",
  PENDING: "Menunggu bank",
  SETTLED: "Cair (burned)",
  CANCELLED: "Ditarik kembali",
};

function fmtDate(sec: bigint) {
  return new Date(Number(sec) * 1000).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function RedeemPage() {
  const {
    requestRedemption,
    reclaim,
    balance,
    requests,
    loadingRequests,
    reclaimTimeout,
    state,
    busy,
  } = useRedeemToken();
  const [amount, setAmount] = useState("");
  const [open, setOpen] = useState(false);

  const isValidNumber = /^\d+$/.test(amount) && BigInt(amount || "0") > 0n;
  const withinBalance = isValidNumber && BigInt(amount) <= balance;
  const canSubmit = isValidNumber && withinBalance;
  const timeoutDays = Number(reclaimTimeout) / 86400;

  const errorMsg =
    amount.length > 0 && !isValidNumber
      ? "Masukkan angka > 0"
      : amount.length > 0 && !withinBalance
      ? "Melebihi saldo"
      : undefined;

  const confirm = async () => {
    const pr = requestRedemption(BigInt(amount));
    toast.promise(pr, {
      loading: "Menitipkan token ke gateway…",
      success:
        "Permintaan penukaran diajukan. Menunggu operator bank mencairkan fiat.",
      error: (e) => getErrorMessage(e),
    });
    try {
      await pr;
      setAmount("");
      setOpen(false);
    } catch {
      
    }
  };

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex max-w-lg flex-col gap-6">
          <PageHeader
            eyebrow="PIC"
            title="Tukar Token ke Rupiah"
            gradient
            subtitle="Ajukan penukaran e-IDR: token dititipkan ke Trusted Gateway (escrow). Operator bank membakar & mencairkan Rupiah setelah verifikasi. Bila tak diproses, token bisa Anda tarik kembali."
          />

          <Card className="rounded-2xl border-black/5 shadow-none">
            <CardContent className="p-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Saldo e-IDR
              </p>
              <p className="mt-1 font-display text-2xl font-semibold tracking-tight text-brand-blue sm:text-3xl">
                {formatIDR(balance.toString())}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-black/5 shadow-none">
            <CardHeader className="flex-row items-center justify-between space-y-0 font-display font-semibold tracking-tight">
              <span>Ajukan Penukaran</span>
              <Badge variant="secondary" className="rounded-sm">
                escrow · non-transferable
              </Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Jumlah (Rupiah)</Label>
                <Input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  aria-invalid={!!errorMsg || undefined}
                  className={cn(
                    errorMsg &&
                      "border-destructive focus-visible:ring-destructive",
                  )}
                />
                {errorMsg ? (
                  <p className="text-xs text-destructive">{errorMsg}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Angka saja, tanpa titik/koma.
                  </p>
                )}
              </div>
              <Button
                disabled={!canSubmit || busy}
                className="w-fit"
                onClick={() => setOpen(true)}
              >
                {busy && <Spinner size={16} className="text-current" />}
                Ajukan Penukaran{" "}
                {state === "approving"
                  ? "(approve…)"
                  : state === "requesting"
                  ? "(escrow…)"
                  : ""}
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-black/5 shadow-none">
            <CardHeader className="font-display font-semibold tracking-tight">
              Permintaan Penukaran Saya
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {loadingRequests ? (
                <Spinner size={16} />
              ) : requests.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Belum ada permintaan penukaran.
                </p>
              ) : (
                requests.map((r) => (
                  <div
                    key={r.id.toString()}
                    className="flex flex-wrap items-center gap-2 border-b border-black/5 py-2.5 text-sm last:border-0"
                  >
                    <span className="font-mono text-muted-foreground">
                      #{r.id.toString()}
                    </span>
                    <span className="font-mono font-medium">
                      {formatIDR(r.amount.toString())}
                    </span>
                    <Badge
                      variant={STATUS_VARIANT[r.status]}
                      className="rounded-sm"
                    >
                      {STATUS_LABEL[r.status]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {fmtDate(r.createdAt)}
                    </span>
                    {r.status === "PENDING" && (
                      <div className="ml-auto">
                        {r.canReclaim ? (
                          <ConfirmButton
                            triggerLabel="Tarik kembali"
                            triggerProps={{
                              size: "sm",
                              color: "danger",
                              variant: "flat",
                            }}
                            title={`Tarik kembali escrow #${r.id.toString()}?`}
                            confirmLabel="Ya, tarik kembali"
                            confirmColor="danger"
                            toasts={{
                              loading: "Menarik…",
                              success: "Escrow dikembalikan ke wallet Anda.",
                            }}
                            action={() => reclaim(r.id)}
                            warnings={[
                              "Token escrow akan dikembalikan ke wallet Anda dan permintaan dibatalkan.",
                              "Lakukan hanya bila operator bank tak kunjung mencairkan fiat.",
                            ]}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            bisa ditarik setelah {timeoutDays} hari
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-6 overflow-hidden rounded-2xl border border-black/5">
            <div className="relative h-64">
              <img
                src="/media/hero-dune.webp"
                alt="Pemandangan"
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-linear-to-t from-[#0b1220]/85 via-[#0b1220]/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/70">
                  e-IDR · Trusted Gateway
                </p>
                <p className="mt-1 font-display text-lg font-semibold leading-tight tracking-tight">
                  Dari token ke Rupiah, terverifikasi.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 bg-muted/30 p-5 text-sm">
              {[
                {
                  n: "1",
                  t: "Ajukan penukaran",
                  d: "Token dititipkan ke gateway (escrow), belum dibakar.",
                },
                {
                  n: "2",
                  t: "Operator bank verifikasi",
                  d: "Bank membakar token & mencairkan Rupiah fisik.",
                },
                {
                  n: "3",
                  t: "Tarik kembali (opsional)",
                  d: `Bila tak diproses, tarik escrow setelah ${timeoutDays} hari.`,
                },
              ].map((s) => (
                <div key={s.n} className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-blue/10 font-mono text-xs font-semibold text-brand-blue">
                    {s.n}
                  </span>
                  <span>
                    <span className="block font-medium text-foreground">
                      {s.t}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {s.d}
                    </span>
                  </span>
                </div>
              ))}
              <p className="mt-1 rounded-lg bg-brand-blue/5 px-3 py-2 text-xs text-muted-foreground">
                1 Rupiah = 1 token eIDR · token non-transferable (hanya bisa
                dibakar di gateway).
              </p>
            </div>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={confirm}
        isLoading={busy}
        title="Konfirmasi pengajuan penukaran"
        confirmLabel="Ya, ajukan penukaran"
        warnings={[
          `Token senilai ${
            isValidNumber ? formatIDR(amount) : ""
          } akan DITITIPKAN ke gateway (escrow), belum dibakar.`,
          "Operator bank akan membakar token & mencairkan Rupiah setelah verifikasi fiat.",
          `Bila belum diproses, Anda bisa menarik kembali token setelah ${timeoutDays} hari.`,
          "Pengajuan hanya setelah melewati jendela clawback 72 jam sejak token dicetak (kebijakan Web2).",
        ]}
      />
    </>
  );
}
