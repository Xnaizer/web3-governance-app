import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AuthLayout } from "../components/AuthLayout";
import { FormInput } from "../components/ui/FormField";
import { PasswordStrength } from "../components/ui/PasswordStrength";
import { registerSchema, type RegisterForm } from "../schemas/auth";
import { useRegister } from "../hooks/useAuth";
import { useTurnstile } from "../hooks/useTurnstile";
import { getErrorMessage } from "../utils/error";

export function RegisterPage() {
  const navigate = useNavigate();
  const { mutateAsync, isPending } = useRegister();
  const turnstile = useTurnstile();
  const { control, handleSubmit, watch } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
  });
  const password = watch("password") ?? "";

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutateAsync({ ...values, turnstileToken: turnstile.token });
      toast.success("Registrasi berhasil. Cek email untuk verifikasi.");
      navigate("/login");
    } catch (e) {
      turnstile.reset();
      toast.error(getErrorMessage(e));
    }
  });

  return (
    <AuthLayout
      title="Buat Akun"
      subtitle="Mulai mengelola atau mengawal dana publik."
      icon={<UserPlus className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.2} />}
      greeting={{
        title: (
          <>
            Selamat datang di{" "}
            <span className="text-gradient">GovernanceFund.</span>
          </>
        ),
        text: "Buat akun dan mulai mengawasi setiap rupiah anggaran.",
      }}
      footer={
        <>
          Sudah punya akun?{" "}
          <Link
            to="/login"
            className="font-medium text-brand-blue hover:underline"
          >
            Masuk
          </Link>
          <span className="mx-2 text-muted-foreground/40">·</span>
          Email verifikasi tidak sampai?{" "}
          <Link
            to="/resend-verification"
            className="font-medium text-brand-blue hover:underline"
          >
            Kirim ulang
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <FormInput
          control={control}
          name="username"
          label="Username"
          isRequired
          autoComplete="username"
        />
        <FormInput
          control={control}
          name="email"
          label="Email"
          type="email"
          isRequired
          autoComplete="email"
        />
        <div className="flex flex-col gap-2">
          <FormInput
            control={control}
            name="password"
            label="Password"
            type="password"
            isRequired
            autoComplete="new-password"
          />
          <PasswordStrength value={password} />
        </div>
        {turnstile.widget}
        <Button
          type="submit"
          size="lg"
          className="mt-2 w-full bg-linear-to-r from-brand-mint to-brand-blue font-medium text-white transition-opacity hover:opacity-95"
          disabled={isPending || !turnstile.ready}
        >
          {isPending && <Spinner size={16} className="text-current" />}
          Daftar
        </Button>
      </form>
    </AuthLayout>
  );
}
