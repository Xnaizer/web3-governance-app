import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AuthLayout } from "../components/AuthLayout";
import { verifyEmail } from "../services/authApi";
import { getErrorMessage } from "../utils/error";

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<{
    status: "loading" | "ok" | "error";
    message: string;
  }>({ status: "loading", message: "" });
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!token) {
      setState({ status: "error", message: "Token verifikasi tidak ada." });
      return;
    }
    verifyEmail(token)
      .then((msg) => setState({ status: "ok", message: msg }))
      .catch((e) => setState({ status: "error", message: getErrorMessage(e) }));
  }, [token]);

  return (
    <AuthLayout
      title="Verifikasi Email"
      subtitle="Kami memeriksa tautan verifikasi Anda."
      icon={<MailCheck className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.2} />}
      greeting={{
        title: (
          <>
            Satu langkah <span className="text-gradient">lagi.</span>
          </>
        ),
        text: "Verifikasi email untuk mengaktifkan akunmu.",
      }}
    >
      {state.status === "loading" && (
        <div className="flex items-center gap-3 text-muted-foreground">
          <Spinner size={18} /> Memverifikasi…
        </div>
      )}

      {state.status === "ok" && (
        <div className="flex flex-col items-start gap-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-mint/15 text-brand-mint sm:h-12 sm:w-12">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <p className="text-sm text-foreground">
            {state.message || "Email berhasil diverifikasi."}
          </p>
          <Button asChild size="lg" className="w-full font-medium">
            <Link to="/login">Ke halaman masuk</Link>
          </Button>
        </div>
      )}

      {state.status === "error" && (
        <div className="flex flex-col items-start gap-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-destructive/10 text-destructive sm:h-12 sm:w-12">
            <XCircle className="h-5 w-5 sm:h-6 sm:w-6" />
          </span>
          <p className="text-xs text-destructive sm:text-sm">{state.message}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Tautan verifikasi hanya berlaku 24 jam. Jika sudah kedaluwarsa,
            minta tautan baru — akun Anda tidak perlu didaftarkan ulang.
          </p>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:gap-3">
            <Button asChild className="flex-1 font-medium">
              <Link to="/resend-verification">Kirim ulang verifikasi</Link>
            </Button>
            <Button asChild variant="secondary" className="flex-1 font-medium">
              <Link to="/login">Ke masuk</Link>
            </Button>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
