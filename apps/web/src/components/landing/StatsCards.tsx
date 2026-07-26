import { useRef, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Reveal } from "../motion/Reveal";
import { AnimatedCounter } from "../motion/AnimatedCounter";

type Card = {
  logo: string;
  from: string;
  to: string;
  value: number;
  suffix?: string;
  label: string;
};

const CARDS: Card[] = [
  {
    logo: "solidity",
    from: "#34D3B5",
    to: "#0E8A79",
    value: 5,
    label: "Layer smart-contract",
  },
  {
    logo: "typescript",
    from: "#5AA2F0",
    to: "#2563EB",
    value: 100,
    suffix: "%",
    label: "TypeScript strict mode",
  },
  {
    logo: "prisma",
    from: "#8B93F7",
    to: "#4F46E5",
    value: 15,
    label: "Model data terindeks",
  },
  {
    logo: "postgresql",
    from: "#38BDF8",
    to: "#0284C7",
    value: 24,
    label: "Audit rekonsiliasi / jam",
  },
  {
    logo: "walletconnect",
    from: "#C084FC",
    to: "#7C3AED",
    value: 3,
    label: "Tanda tangan / milestone",
  },
  {
    logo: "redis",
    from: "#22D3EE",
    to: "#0891B2",
    value: 6,
    label: "Antrean kerja BullMQ",
  },
  {
    logo: "react",
    from: "#A78BFA",
    to: "#6D28D9",
    value: 4,
    label: "Tab explorer publik",
  },
  {
    logo: "ethereum",
    from: "#34D399",
    to: "#059669",
    value: 67,
    suffix: "%",
    label: "Ambang konsensus BFT",
  },
];

function whiteLogoMask(src: string): CSSProperties {
  return {
    backgroundColor: "#ffffff",
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

export function StatsCards() {
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, startX: 0, startLeft: 0 });
  const scrollBy = (dir: number) =>
    track.current?.scrollBy({ left: dir * 280, behavior: "smooth" });

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !track.current) return;
    drag.current = {
      active: true,
      startX: e.clientX,
      startLeft: track.current.scrollLeft,
    };
    track.current.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active || !track.current) return;
    track.current.scrollLeft =
      drag.current.startLeft - (e.clientX - drag.current.startX);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    drag.current.active = false;
    track.current?.releasePointerCapture(e.pointerId);
  };

  return (
    <section data-nav-theme="light" className="bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-8 lg:grid-cols-3 lg:items-end">
          <Reveal className="lg:col-span-2">
            <span className="text-xs font-medium uppercase tracking-[0.25em] text-brand-blue">
              Di balik layar
            </span>
            <h2 className="mt-3 font-display text-2xl font-semibold leading-[1.1] tracking-tight sm:text-4xl">
              Dibangun rapi, terukur, dan bisa diaudit.
            </h2>
            <p className="mt-4 max-w-xl text-pretty text-sm text-muted-foreground sm:text-base">
              Bukan sekadar klaim — arsitekturnya nyata: kontrak on-chain, data
              terindeks, dan lapisan anti-kecurangan yang bekerja bersama dalam
              satu monorepo.
            </p>
          </Reveal>
          <Reveal delay={0.1} className="lg:justify-self-end">
            <Link
              to="/programs"
              className="group inline-flex items-center gap-1.5 rounded-xl bg-foreground px-5 py-3 text-sm font-medium text-background transition-transform hover:scale-[1.03]"
            >
              Jelajahi datanya
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </Reveal>
        </div>

        <Reveal className="mt-12">
          <div
            ref={track}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="group/cards flex cursor-grab select-none gap-4 overflow-x-auto pb-2 scrollbar-none active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
          >
            {CARDS.map((c, i) => (
              <div
                key={c.logo + i}
                className="flex aspect-3/4 w-56 shrink-0 flex-col justify-between overflow-hidden rounded-3xl p-6 text-white shadow-soft transition-all duration-300 group-hover/cards:opacity-45 group-hover/cards:blur-[2px] hover:opacity-100! hover:blur-none!"
                style={{
                  background: `linear-gradient(140deg, ${c.from}, ${c.to})`,
                }}
              >
                <span
                  aria-hidden
                  className="h-8 w-8"
                  style={whiteLogoMask(`/logos/${c.logo}.svg`)}
                />
                <div>
                  <p className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                    <AnimatedCounter value={c.value} suffix={c.suffix} />
                  </p>
                  <p className="mt-1.5 text-sm font-medium leading-snug text-white/80">
                    {c.label}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              aria-label="Sebelumnya"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 text-foreground transition-colors hover:bg-muted"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              aria-label="Berikutnya"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 text-foreground transition-colors hover:bg-muted"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
