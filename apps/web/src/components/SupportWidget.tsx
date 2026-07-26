import { useState } from "react";
import { LifeBuoy, X, Mail, Bug, MessageCircleQuestion } from "lucide-react";
import { cn } from "@/utils/cn";

const DEV_EMAIL = "governancefund.business@gmail.com";
const GITHUB_REPO = "https://github.com/Xnaizer/GOVERNANCEFUND";

export function SupportWidget() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3">
      <div
        className={cn(
          "w-72 origin-bottom-right overflow-hidden rounded-2xl border border-black/5 bg-background shadow-xl transition-all duration-200",
          open
            ? "pointer-events-auto scale-100 opacity-100"
            : "pointer-events-none scale-90 opacity-0 hidden",
        )}
      >
        <div className="relative overflow-hidden bg-[#0b1220] p-5 text-white">
          <span className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-brand-blue/30 blur-2xl" />
          <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
            <MessageCircleQuestion className="h-5 w-5" />
          </span>
          <p className="relative mt-3 font-display text-base font-semibold tracking-tight">
            Ada masalah?
          </p>
          <p className="relative mt-1 text-xs text-white/60">
            Hubungi Departemen Developer — kami bantu secepatnya.
          </p>
        </div>
        <div className="flex flex-col gap-1 p-2">
          <a
            href={`mailto:${DEV_EMAIL}?subject=Bantuan%20GovernanceFund`}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
              <Mail className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block font-medium">Email developer</span>
              <span className="block truncate text-xs text-muted-foreground">
                {DEV_EMAIL}
              </span>
            </span>
          </a>
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
              <Bug className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block font-medium">Lapor lewat GitHub</span>
              <span className="block truncate text-xs text-muted-foreground">
                Buka issue di repo
              </span>
            </span>
          </a>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Tutup bantuan" : "Butuh bantuan?"}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background shadow-lg transition-transform hover:scale-105"
      >
        {open ? <X className="h-5 w-5" /> : <LifeBuoy className="h-5 w-5" />}
      </button>
    </div>
  );
}
