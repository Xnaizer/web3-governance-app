import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { MailCheck, MailPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AuthLayout } from "../components/AuthLayout";
import { FormInput } from "../components/ui/FormField";
import { forgotSchema, type ForgotForm } from "../schemas/auth";
import { useResendVerification } from "../hooks/useAuth";
import { useTurnstile } from "../hooks/useTurnstile";
import { getErrorMessage } from "../utils/error";

export function ResendVerificationPage() {
  const { mutateAsync, isPending } = useResendVerification();
  const turnstile = useTurnstile();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { control, handleSubmit } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
    mode: "onTouched",
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    try {
      await mutateAsync({ email, turnstileToken: turnstile.token });
      setSentTo(email);
    } catch (e) {
      turnstile.reset();
      toast.error(getErrorMessage(e));
    }
  });

  return (
    <AuthLayout
      title="Kirim Ulang Verifikasi"
      subtitle="Tautan verifikasi hanya berlaku 24 jam."
      icon={<MailPlus className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.2} />}
      greeting={{
        title: (
          <>
            Tautannya <span className="text-gradient">kedaluwarsa?</span>
          </>
        ),
        text: "Masukkan email pendaftaran Anda dan kami kirim tautan verifikasi yang baru.",
      }}
    >
      {sentTo ? (
        <div className="flex flex-col items-center gap-5 py-5 text-center sm:gap-6 sm:py-6">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 sm:h-14 sm:w-14">
            <MailCheck className="h-6 w-6 sm:h-7 sm:w-7" />
          </span>
          <div>
            <p className="font-display text-base font-semibold tracking-tight sm:text-lg">
              Cek email Anda
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Jika <b className="text-foreground">{sentTo}</b> terdaftar dan
              belum terverifikasi, kami telah mengirim tautan verifikasi baru.
              Periksa juga folder <b>Spam/Promosi</b>. Tautan berlaku 24 jam.
            </p>
          </div>
          <Button asChild variant="secondary" className="w-full">
            <Link to="/login">Kembali ke Masuk</Link>
          </Button>
          <button
            type="button"
            onClick={() => setSentTo(null)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Salah email? Kirim ulang
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <FormInput
            control={control}
            name="email"
            label="Email"
            type="email"
            isRequired
            autoComplete="email"
          />
          {turnstile.widget}
          <Button
            type="submit"
            size="lg"
            className="mt-2 w-full bg-linear-to-r from-brand-mint to-brand-blue font-medium text-white transition-opacity hover:opacity-95"
            disabled={isPending || !turnstile.ready}
          >
            {isPending && <Spinner size={16} className="text-current" />}
            Kirim Ulang Tautan
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Sudah terverifikasi?{" "}
            <Link to="/login" className="font-medium text-foreground underline">
              Masuk
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
