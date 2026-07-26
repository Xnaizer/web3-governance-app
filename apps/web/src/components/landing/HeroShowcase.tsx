import { useRef, useState } from "react";
import { HorizontalPin } from "../motion/HorizontalPin";
import { Reveal } from "../motion/Reveal";
import { cn } from "@/utils/cn";

const PANELS = [
  {
    img: "/media/1.svg",
    label: "Explorer publik",
    sub: "Pantau tanpa login",
    color: "#67F3CE",
  },
  {
    img: "/media/2.svg",
    label: "Jejak on-chain",
    sub: "Setiap aksi terekam",
    color: "#4899EA",
  },
  {
    img: "/media/3.svg",
    label: "Multi-signature",
    sub: "3 tanda tangan wajib",
    color: "#818CF8",
  },
  {
    img: "/media/4.svg",
    label: "Pembekuan instan",
    sub: "Auditor independen",
    color: "#38BDF8",
  },
  {
    img: "/media/5.svg",
    label: "Konsensus 67%",
    sub: "Tak ada aktor tunggal",
    color: "#C084FC",
  },
];

export function HeroShowcase() {
  const [p, setP] = useState(0);
  const seek = useRef<((f: number) => void) | null>(null);

  const last = PANELS.length - 1;
  const activeIdx = Math.min(last, Math.round(p * last));
  const activeColor = PANELS[activeIdx].color;

  return (
    <section data-nav-theme="light" className="relative bg-background">
      <div className="mx-auto max-w-3xl px-6 pb-2 pt-24 text-center">
        <Reveal>
          <span className="text-xs font-medium uppercase tracking-[0.25em] text-brand-blue">
            Transparansi
          </span>
          <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-4xl">
            Terbuka di <span className="text-gradient">setiap lapisan.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-sm text-muted-foreground sm:text-base">
            Dari pengajuan proposal hingga pencairan bertahap — setiap langkah
            tercatat, terverifikasi, dan dapat ditelusuri siapa pun tanpa perlu
            izin.
          </p>
        </Reveal>
      </div>

      <HorizontalPin
        onProgress={setP}
        seekRef={seek}
        className="h-screen"
        trackClassName="h-screen items-center gap-6 px-[14vw]"
        overlay={
          <div className="pointer-events-auto absolute bottom-7 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-3 rounded-full border border-black/10 bg-white/70 py-2 pl-4 pr-3 shadow-soft backdrop-blur-md">
              <span
                className="hidden text-xs font-semibold sm:block"
                style={{ color: activeColor, transition: "color 0.4s" }}
              >
                {PANELS[activeIdx].label}
              </span>
              <span className="hidden h-4 w-px bg-black/10 sm:block" />
              <div className="flex items-center gap-1.5">
                {PANELS.map((panel, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => seek.current?.(i / last)}
                    aria-label={panel.label}
                    className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      i === activeIdx
                        ? "w-6"
                        : "w-2 bg-black/25 hover:bg-black/45",
                    )}
                    style={
                      i === activeIdx
                        ? { backgroundColor: panel.color }
                        : undefined
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        }
      >
        {PANELS.map((panel, i) => (
          <figure
            key={i}
            className="relative h-[58vh] w-[68vw] shrink-0 overflow-hidden rounded-4xl border border-black/5 shadow-soft sm:h-[62vh] sm:w-[50vw] lg:w-[36vw]"
          >
            <img
              src={panel.img}
              alt={panel.label}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent p-6 text-white">
              <p className="font-display text-xl font-semibold sm:text-2xl">
                {panel.label}
              </p>
              <p className="text-sm text-white/80">{panel.sub}</p>
            </figcaption>
          </figure>
        ))}
      </HorizontalPin>
    </section>
  );
}
