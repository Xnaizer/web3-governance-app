import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { LockKeyhole, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AuthLayout } from "../components/AuthLayout";
import { FormInput } from "../components/ui/FormField";
import { resetSchema, type ResetForm } from "../schemas/auth";
import { useResetPassword } from "../hooks/useAuth";
import { useTurnstile } from "../hooks/useTurnstile";
import { getErrorMessage } from "../utils/error";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const { mutateAsync, isPending } = useResetPassword();
  const turnstile = useTurnstile();
  const { control, handleSubmit } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    mode: "onTouched",
  });

  const onSubmit = handleSubmit(async ({ newPassword }) => {
    try {
      await mutateAsync({
        token,
        newPassword,
        turnstileToken: turnstile.token,
      });
      toast.success("Password berhasil diperbarui. Silakan masuk.");
      navigate("/login");
    } catch (e) {
      turnstile.reset();
      toast.error(getErrorMessage(e));
    }
  });

  return (
    <AuthLayout
      title="Atur Ulang Password"
      subtitle="Buat password baru untuk akun Anda."
      icon={<LockKeyhole className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.2} />}
      greeting={{
        title: (
          <>
            Amankan kembali <span className="text-gradient">akun Anda.</span>
          </>
        ),
        text: "Masukkan password baru minimal 8 karakter, lalu konfirmasi.",
      }}
      footer={
        <>
          Sudah ingat?{" "}
          <Link
            to="/login"
            className="font-medium text-brand-blue hover:underline"
          >
            Masuk
          </Link>
        </>
      }
    >
      {!token ? (
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 sm:h-14 sm:w-14">
            <TriangleAlert className="h-7 w-7" />
          </span>
          <div>
            <p className="font-display text-lg font-semibold tracking-tight">
              Tautan tidak valid
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Token reset tidak ditemukan atau sudah kedaluwarsa. Silakan minta
              tautan baru.
            </p>
          </div>
          <Button asChild variant="secondary" className="w-full">
            <Link to="/forgot-password">Minta Tautan Baru</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <FormInput
            control={control}
            name="newPassword"
            label="Password Baru"
            type="password"
            isRequired
            autoComplete="new-password"
          />
          <FormInput
            control={control}
            name="confirm"
            label="Konfirmasi Password"
            type="password"
            isRequired
            autoComplete="new-password"
          />
          {turnstile.widget}
          <Button
            type="submit"
            size="lg"
            className="mt-2 w-full bg-linear-to-r from-brand-mint to-brand-blue font-medium text-white transition-opacity hover:opacity-95"
            disabled={isPending || !turnstile.ready}
          >
            {isPending && <Spinner size={16} className="text-current" />}
            Simpan Password Baru
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
