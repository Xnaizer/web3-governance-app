import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { KeyRound, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AuthLayout } from "../components/AuthLayout";
import { FormInput } from "../components/ui/FormField";
import { forgotSchema, type ForgotForm } from "../schemas/auth";
import { useForgotPassword } from "../hooks/useAuth";
import { useTurnstile } from "../hooks/useTurnstile";
import { getErrorMessage } from "../utils/error";

export function ForgotPasswordPage() {
  const { mutateAsync, isPending } = useForgotPassword();
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
      title="Lupa Password"
      subtitle="Kami akan mengirim tautan atur ulang ke email Anda."
      icon={<KeyRound className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.2} />}
      greeting={{
        title: (
          <>
            Tenang, <span className="text-gradient">kami bantu pulihkan.</span>
          </>
        ),
        text: "Masukkan email akun Anda dan ikuti tautan yang kami kirim untuk membuat password baru.",
      }}
    >
      {sentTo ? (
       
        <div className="flex flex-col items-center gap-6 py-6 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
            <MailCheck className="h-7 w-7" />
          </span>
          <div>
            <p className="font-display text-lg font-semibold tracking-tight">
              Cek email Anda
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Jika <b className="text-foreground">{sentTo}</b> terdaftar, kami
              telah mengirim tautan atur ulang password. Periksa juga folder{" "}
              <b>Spam/Promosi</b>. Tautan berlaku sementara.
            </p>
          </div>
          <Button asChild variant="secondary" className="w-full">
            <Link to="/login">Kembali ke Masuk</Link>
          </Button>
          <button
            type="button"
            onClick={() => setSentTo(null)}
            className="mt-2 text-xs text-muted-foreground hover:text-foreground"
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
            Kirim Tautan Reset
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
