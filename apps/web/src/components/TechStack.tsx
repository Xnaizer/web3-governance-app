import { Reveal } from "./motion/Reveal";

interface Tech {
  slug: string;
  name: string;
  role: string;
}

const GROUPS: { label: string; items: Tech[] }[] = [
  {
    label: "Blockchain",
    items: [
      { slug: "solidity", name: "Solidity", role: "Kontrak pintar 0.8.35" },
      { slug: "ethereum", name: "Base Sepolia", role: "Jaringan L2 EVM" },
      { slug: "walletconnect", name: "WalletConnect", role: "Koneksi dompet" },
    ],
  },
  {
    label: "Frontend",
    items: [
      { slug: "react", name: "React", role: "Antarmuka SPA" },
      { slug: "vite", name: "Vite", role: "Build tool" },
      { slug: "typescript", name: "TypeScript", role: "Type safety" },
      { slug: "tailwindcss", name: "Tailwind CSS", role: "Sistem desain" },
    ],
  },
  {
    label: "Backend",
    items: [
      { slug: "express", name: "Express", role: "REST API" },
      { slug: "prisma", name: "Prisma", role: "ORM type-safe" },
      { slug: "postgresql", name: "PostgreSQL", role: "Basis data relasional" },
      { slug: "supabase", name: "Supabase", role: "Hosting database" },
      { slug: "redis", name: "Redis", role: "Cache & rate limit" },
    ],
  },
];

export function TechStack() {
  return (
    <section className="px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <Reveal className="text-center">
          <span className="text-xs font-medium uppercase tracking-[0.25em] text-brand-blue">
            Teknologi
          </span>
          <h2 className="mt-3 font-display text-xl font-semibold tracking-tight sm:text-3xl">
            Dibangun di atas <span className="text-gradient">standar terbuka.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-xs text-muted-foreground sm:text-sm">
            Setiap komponen dipilih agar dapat diaudit publik — tidak ada bagian
            yang tersembunyi di balik layanan tertutup.
          </p>
        </Reveal>

        <div className="mt-8 flex flex-col gap-6 sm:mt-10 sm:gap-8">
          {GROUPS.map((group, gi) => (
            <Reveal key={group.label} delay={0.05 * gi}>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                {group.label}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
                {group.items.map((tech) => (
                  <div
                    key={tech.slug}
                    className="flex items-center gap-3 rounded-xl border border-black/5 bg-white p-3 transition-colors hover:border-black/10 sm:p-4 dark:bg-white/5"
                  >
                    <img
                      src={`/logos/${tech.slug}.svg`}
                      alt=""
                      aria-hidden
                      draggable={false}
                      className="h-6 w-6 shrink-0 sm:h-7 sm:w-7"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-foreground sm:text-sm">
                        {tech.name}
                      </p>
                      <p className="truncate text-[10px] text-muted-foreground sm:text-xs">
                        {tech.role}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
