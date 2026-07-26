import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LogIn, MailWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AuthLayout } from "../components/AuthLayout";
import { FormInput } from "../components/ui/FormField";
import { loginSchema, type LoginForm } from "../schemas/auth";
import { useLogin } from "../hooks/useAuth";
import { useTurnstile } from "../hooks/useTurnstile";
import { getErrorMessage, getErrorStatus } from "../utils/error";

export function LoginPage() {
  const navigate = useNavigate();
  const { mutateAsync, isPending } = useLogin();
  const turnstile = useTurnstile();
  const [needsVerify, setNeedsVerify] = useState(false);
  const { control, handleSubmit } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutateAsync({ ...values, turnstileToken: turnstile.token });
      toast.success("Berhasil masuk.");
      navigate("/dashboard");
    } catch (e) {
      turnstile.reset();
      // 403 is the "account not activated" case — a toast would vanish and leave
      // the user stuck, so surface a persistent way out instead.
      setNeedsVerify(getErrorStatus(e) === 403);
      toast.error(getErrorMessage(e));
    }
  });

  return (
    <AuthLayout
      title="Masuk"
      subtitle="Lanjut mengelola atau mengawasi anggaran."
      icon={<LogIn className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.2} />}
      greeting={{
        title: (
          <>
            Hei, senang <span className="text-gradient">melihatmu lagi.</span>
          </>
        ),
        text: "Masuk untuk melanjutkan mengawal dana publik.",
      }}
      footer={
        <>
          Belum punya akun?{" "}
          <Link
            to="/register"
            className="font-medium text-brand-blue hover:underline"
          >
            Daftar
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {needsVerify && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
            <MailWarning className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div className="min-w-0 text-xs leading-relaxed">
              <p className="font-medium text-foreground">
                Akun belum terverifikasi
              </p>
              <p className="mt-1 text-muted-foreground">
                Tautan verifikasi berlaku 24 jam.{" "}
                <Link
                  to="/resend-verification"
                  className="font-medium text-brand-blue underline"
                >
                  Kirim ulang tautan
                </Link>
                .
              </p>
            </div>
          </div>
        )}
        <FormInput
          control={control}
          name="identifier"
          label="Email atau Username"
          isRequired
          autoComplete="username"
        />
        <FormInput
          control={control}
          name="password"
          label="Password"
          type="password"
          isRequired
          autoComplete="current-password"
        />
        <div className="-mt-1 text-right">
          <Link
            to="/forgot-password"
            className="text-xs font-medium text-brand-blue hover:underline"
          >
            Lupa password?
          </Link>
        </div>
        {turnstile.widget}
        <Button
          type="submit"
          size="lg"
          className="mt-2 w-full bg-linear-to-r from-brand-mint to-brand-blue font-medium text-white transition-opacity hover:opacity-95"
          disabled={isPending || !turnstile.ready}
        >
          {isPending && <Spinner size={16} className="text-current" />}
          Masuk
        </Button>
      </form>
    </AuthLayout>
  );
}
