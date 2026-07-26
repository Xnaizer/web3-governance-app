import { type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";

const COLUMNS: {
  title: string;
  links: { label: string; to: string; external?: boolean }[];
}[] = [
  {
    title: "Jelajahi",
    links: [
      { label: "Program", to: "/programs" },
      { label: "Pengguna", to: "/users" },
      { label: "Vote Peran", to: "/governance/votes" },
      { label: "Vote Program", to: "/governance/program-votes" },
      { label: "Log Peran", to: "/governance/roles" },
      { label: "Penukaran", to: "/gateway/redemptions" },
      { label: "Tentang", to: "/about" },
    ],
  },
  {
    title: "Sistem",
    links: [
      { label: "Alur program", to: "/" },
      { label: "Anti-kecurangan", to: "/" },
      { label: "Reputasi", to: "/" },
      { label: "Multi-signature", to: "/" },
    ],
  },
  {
    title: "Sumber",
    links: [
      { label: "Dokumentasi", to: "/" },
      {
        label: "Smart contract",
        to: "https://sepolia.basescan.org",
        external: true,
      },
      { label: "Whitepaper", to: "/" },
      { label: "FAQ", to: "/" },
    ],
  },
  {
    title: "Akun",
    links: [
      { label: "Masuk", to: "/login" },
      { label: "Daftar", to: "/register" },
    ],
  },
];

const SOCIALS = [
  {
    logo: "github",
    href: "https://github.com/Xnaizer/GOVERNANCEFUND",
    label: "GitHub",
  },
  { logo: "x", href: "https://twitter.com", label: "Twitter / X" },
  { logo: "linkedin", href: "https://linkedin.com", label: "LinkedIn" },
];

function iconMask(src: string): CSSProperties {
  return {
    backgroundColor: "currentColor",
    WebkitMaskImage: `url(${src})`,
    maskImage: `url(${src})`,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
    WebkitMaskSize: "contain",
    maskSize: "contain",
  };
}

export function LandingFooter() {
  return (
    <footer
      data-nav-theme="dark"
      className="bg-background px-4 pb-6 pt-2 sm:px-6 sm:pb-10"
    >
      <div className="relative mx-auto w-[95%] max-w-none overflow-hidden rounded-4xl bg-[#080a0f] px-6 py-16 text-white sm:rounded-[2.5rem] sm:px-12 sm:py-20 lg:px-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-56 overflow-hidden"
        >
          <div
            className="absolute -inset-x-8 -top-16 h-48 opacity-55 blur-xl"
            style={{
              background:
                "linear-gradient(100deg, #f97316, #e0559e, #8b5cf6, #4899ea, #67f3ce)",
            }}
          />
          <div className="absolute inset-0 bg-linear-to-b from-transparent via-[#080a0f]/60 to-[#080a0f]" />
        </div>

        <div className="relative flex flex-col items-start justify-between gap-8 border-b border-white/10 pb-14 lg:flex-row lg:items-end">
          <div className="max-w-xl">
            <h2 className="font-display text-2xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
              Dana publik yang{" "}
              <span className="text-gradient">tak bisa dicurangi.</span>
            </h2>
            <p className="mt-4 text-pretty text-sm text-white/60 sm:text-base">
              Mulai kelola atau awasi anggaran dengan bukti kriptografis di
              setiap langkah.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Link
              to="/register"
              className="rounded-xl bg-white px-6 py-3 text-sm font-medium text-[#080a0f] transition-transform hover:scale-[1.03]"
            >
              Mulai sekarang
            </Link>
            <Link
              to="/programs"
              className="rounded-xl border border-white/20 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/5"
            >
              Buka Explorer
            </Link>
          </div>
        </div>

        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Link to="/" className="flex flex-col leading-[0.95]">
              <span className="font-display text-base font-bold tracking-[0.2em]">
                GOVERNANCE
              </span>
              <span className="bg-linear-to-r from-brand-mint to-brand-blue bg-clip-text font-display text-base font-bold tracking-[0.36em] text-transparent">
                FUND
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-white/55">
              Sistem tata kelola dana publik hibrida Web2 + Web3 yang membuat
              kecurangan mekanis mustahil.
            </p>
            <div className="mt-6 flex items-center gap-3">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/70 transition-colors hover:border-white/25 hover:text-white"
                >
                  <span
                    aria-hidden
                    className="h-4 w-4"
                    style={iconMask(`/logos/${s.logo}.svg`)}
                  />
                </a>
              ))}
              <a
                href="mailto:halo@governancefund.id"
                aria-label="Email"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/70 transition-colors hover:border-white/25 hover:text-white"
              >
                <Mail className="h-4 w-4" />
              </a>
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="font-display text-sm font-semibold tracking-tight text-white/90">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.external ? (
                      <a
                        href={l.to}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-white/55 transition-colors hover:text-white"
                      >
                        {l.label}
                      </a>
                    ) : (
                      <Link
                        to={l.to}
                        className="text-sm text-white/55 transition-colors hover:text-white"
                      >
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-sm text-white/45 sm:flex-row">
          <p>
            © {new Date().getFullYear()} GovernanceFund — proyek akademik. Base
            Sepolia testnet.
          </p>
          <div className="flex items-center gap-6">
            <Link to="/" className="transition-colors hover:text-white">
              Kebijakan Privasi
            </Link>
            <Link to="/" className="transition-colors hover:text-white">
              Ketentuan
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
