import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Aurora } from "./backgrounds/Aurora";
import { Grain } from "./backgrounds/Grain";

function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={`flex w-fit flex-col leading-[0.95] ${className ?? ""}`}
    >
      <span className="font-display text-sm font-bold tracking-[0.2em]">
        GOVERNANCE
      </span>
      <span className="bg-linear-to-r from-brand-mint to-brand-blue bg-clip-text font-display text-sm font-bold tracking-[0.36em] text-transparent">
        FUND
      </span>
    </Link>
  );
}

export function AuthLayout({
  title,
  subtitle,
  icon,
  greeting,
  children,
  footer,
}: {
  title: string;
  subtitle?: ReactNode;
  icon?: ReactNode;
  greeting?: { title: ReactNode; text?: ReactNode };
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-[#0b1220] text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Aurora className="opacity-70" />

        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            className="absolute right-[-6%] top-[10%] h-52 w-52 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 32% 26%, #bff6ea, #4899ea 46%, #21407c 100%)",
              boxShadow: "0 40px 80px -20px rgba(72,153,234,0.55)",
            }}
          />
          <div
            className="absolute bottom-[-8%] left-[-8%] h-64 w-64 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 30% 24%, #dcccff, #8b5cf6 48%, #3a1f78 100%)",
              boxShadow: "0 40px 80px -20px rgba(139,92,246,0.5)",
            }}
          />
          <div
            className="absolute bottom-[24%] right-[22%] h-24 w-24 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 32% 26%, #ccfff2, #67f3ce 50%, #128a72 100%)",
              boxShadow: "0 24px 50px -16px rgba(103,243,206,0.55)",
            }}
          />
        </div>
        <Grain className="opacity-40" />

        <Wordmark className="relative" />

        <div className="relative">
          <h2 className="max-w-md font-display text-3xl font-semibold leading-[1.1] tracking-tight xl:text-4xl">
            {greeting?.title ?? (
              <>
                Dana publik untuk{" "}
                <span className="text-gradient">setiap warga.</span>
              </>
            )}
          </h2>
          {greeting?.text && (
            <p className="mt-4 max-w-sm text-sm text-white/60">
              {greeting.text}
            </p>
          )}
        </div>

        <p className="relative text-xs text-white/50">
          Base Sepolia · Proyek akademik
        </p>
      </div>

      <div className="relative flex flex-col px-5 py-5 sm:px-12 sm:py-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-64 overflow-hidden lg:hidden"
        >
          <div className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-brand-blue/10 blur-[90px]" />
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-brand-mint/10 blur-[90px]" />
        </div>

        <div className="relative flex items-center justify-between">
          <Wordmark className="lg:invisible" />
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Beranda
          </Link>
        </div>

        <div className="relative flex flex-1 flex-col justify-center py-6 sm:py-10">
          <div className="mx-auto w-full max-w-md">
            <div className="flex items-center gap-2.5">
              {icon && <span className="shrink-0 text-brand-blue">{icon}</span>}
              <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
                {title}
              </h1>
            </div>
            {subtitle && (
              <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
                {subtitle}
              </p>
            )}

            <div className="mt-6 sm:mt-8">{children}</div>

            {footer && (
              <div className="mt-5 text-xs text-muted-foreground sm:text-sm">
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
