import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  ShieldCheck,
  Scale,
  Eye,
  Lock,
  GraduationCap,
  FileCode2,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  HelpCircle,
} from "lucide-react";
import { useState, type CSSProperties } from "react";
import { CONTRACT_ADDRESS } from "@repo/shared";
import { LandingNav } from "../components/landing/LandingNav";
import { LandingFooter } from "../components/landing/LandingFooter";
import { Reveal } from "../components/motion/Reveal";
import { Glow } from "../components/backgrounds/Glow";
import { cn } from "@/utils/cn";

const GITHUB_REPO = "https://github.com/Xnaizer/GOVERNANCEFUND";
const GITHUB_PROFILE = "https://github.com/Xnaizer";
const EXPLORER = "https://sepolia.basescan.org";
const addressUrl = (addr: string) => `${EXPLORER}/address/${addr}`;

const POLICIES = [
  {
    icon: Eye,
    color: "#4899EA",
    title: "Transparansi publik",
    body: "Setiap program, pencairan, hingga percobaan bypass ditampilkan terbuka di Explorer publik tanpa perlu login. Anomali tidak disembunyikan — justru dibongkar.",
  },
  {
    icon: Scale,
    color: "#67F3CE",
    title: "Wewenang finansial on-chain",
    body: "Tidak ada aktor tunggal yang bisa memindahkan dana. Persetujuan butuh konsensus BFT 67% dan pencairan butuh tiga tanda tangan EIP-712 dari peran berbeda.",
  },
  {
    icon: Lock,
    color: "#818CF8",
    title: "Data & privasi",
    body: "Hanya data non-sensitif yang di-anchor on-chain — dalam bentuk hash SHA-256 satu-arah, bukan data mentah. Berkas identitas & dokumen internal tetap tersimpan privat di Web2.",
  },
  {
    icon: GraduationCap,
    color: "#C084FC",
    title: "Proyek akademik",
    body: "GovernanceFund berjalan di Base Sepolia testnet untuk tujuan riset & demonstrasi. Bukan produk finansial, tidak mengelola dana riil, dan disediakan apa adanya (MIT).",
  },
];

const CONTRACTS = [
  {
    label: "GovernanceFund",
    sub: "Web3Governance — inti tata kelola & multi-signature",
    address: CONTRACT_ADDRESS.web3Governance,
    color: "#4899EA",
  },
  {
    label: "TrustedGateway",
    sub: "TrustedGatewayBurner — gerbang penukaran token ke fiat",
    address: CONTRACT_ADDRESS.trustedGatewayBurner,
    color: "#67F3CE",
  },
  {
    label: "RupiahToken",
    sub: "e-IDR — token non-transferable, mint-on-demand",
    address: CONTRACT_ADDRESS.rupiahToken,
    color: "#818CF8",
  },
  {
    label: "Deployer",
    sub: "Alamat yang men-deploy seluruh kontrak",
    address: CONTRACT_ADDRESS.deployerAddress,
    color: "#C084FC",
  },
];

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

const ghMask: CSSProperties = {
  backgroundColor: "currentColor",
  WebkitMaskImage: "url(/logos/github.svg)",
  maskImage: "url(/logos/github.svg)",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskPosition: "center",
  WebkitMaskSize: "contain",
  maskSize: "contain",
};

function ContractRow({ c }: { c: (typeof CONTRACTS)[number] }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(c.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {}
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/4 p-5 transition-colors hover:border-white/20 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <FileCode2
          className="mt-0.5 h-5 w-5 shrink-0"
          style={{ color: c.color }}
        />
        <div>
          <p className="font-display text-sm font-semibold tracking-tight text-white">
            {c.label}
          </p>
          <p className="mt-0.5 text-xs text-white/55">{c.sub}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 pl-12 sm:pl-0">
        <code className="font-mono text-xs text-white/70">
          {short(c.address)}
        </code>
        <button
          type="button"
          onClick={copy}
          aria-label={`Salin alamat ${c.label}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/60 transition-colors hover:border-white/25 hover:text-white"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-brand-mint" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
        <a
          href={addressUrl(c.address)}
          target="_blank"
          rel="noreferrer"
          aria-label={`Buka ${c.label} di BaseScan`}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs font-medium text-white/70 transition-colors hover:border-white/25 hover:text-white"
        >
          BaseScan <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

const FAQS = [
  {
    q: "Apa itu GovernanceFund?",
    a: "Sistem tata kelola dana publik hibrida Web2 + Web3 yang membuat penggelapan dan pemalsuan dokumen mustahil secara mekanis — bukan ditemukan setelah kejadian, tapi dicegah sebelum terjadi lewat kontrak pintar & multi-signature.",
  },
  {
    q: "Apakah ini memakai uang sungguhan?",
    a: "Tidak. Ini proyek akademik yang berjalan di jaringan uji Base Sepolia (testnet). Token e-IDR hanyalah representasi untuk demonstrasi, bukan alat pembayaran riil.",
  },
  {
    q: "Bagaimana kecurangan dicegah?",
    a: "Wewenang finansial sepenuhnya on-chain: persetujuan butuh konsensus BFT 67%, pencairan milestone butuh 3 tanda tangan EIP-712 dari peran berbeda, dan setiap program diikat hash SHA-256. Percobaan bypass justru ditampilkan terbuka, bukan disembunyikan.",
  },
  {
    q: "Siapa saja yang terlibat?",
    a: "Lima peran dengan wewenang terpisah dan saling mengunci: Admin, Validator, Auditor, PIC (penanggung jawab), dan pengguna publik yang bisa memantau tanpa login.",
  },
  {
    q: "Apakah kodenya terbuka?",
    a: "Ya. Seluruh monorepo (kontrak, backend, frontend) dilisensikan MIT dan bebas dipelajari, dimodifikasi, serta digunakan ulang.",
  },
  {
    q: "Bagaimana cara ikut memantau?",
    a: "Buka Explorer publik — semua program, pencairan, voting, dan log perubahan peran bisa ditelusuri siapa pun tanpa akun.",
  },
];

function FaqRow({
  item,
  open,
  onToggle,
}: {
  item: (typeof FAQS)[number];
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-black/5 last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 py-5 text-left"
        aria-expanded={open}
      >
        <span className="font-display text-base font-semibold tracking-tight sm:text-lg">
          {item.q}
        </span>
        <ChevronDown
          className={cn(
            "ml-auto h-5 w-5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-all duration-300",
          open ? "grid-rows-[1fr] pb-5" : "grid-rows-[0fr]",
        )}
      >
        <p className="overflow-hidden text-pretty text-sm leading-relaxed text-muted-foreground">
          {item.a}
        </p>
      </div>
    </div>
  );
}

export function AboutPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-background">
      <LandingNav />

      <main>
        <section className="relative overflow-hidden px-6 pb-16 pt-36 sm:pt-40">
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <span className="text-xs font-medium uppercase tracking-[0.25em] text-brand-blue">
                Tentang
              </span>
              <h1 className="mt-4 font-display text-3xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
                Mengawal dana publik dengan{" "}
                <span className="text-gradient">bukti, bukan kepercayaan.</span>
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mx-auto mt-5 max-w-xl text-pretty text-sm text-muted-foreground sm:text-base">
                GovernanceFund adalah sistem tata kelola dana institusional
                hibrida Web2 + Web3 yang membuat penggelapan dan pemalsuan
                dokumen mustahil secara mekanis — sebelum terjadi, bukan setelah
                uang lenyap.
              </p>
            </Reveal>
          </div>
        </section>

        <section className="px-6 pb-8">
          <div className="mx-auto grid max-w-5xl gap-8 rounded-3xl border border-black/5 bg-muted/40 p-8 sm:p-10 lg:grid-cols-2 lg:gap-12">
            <Reveal>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-brand-blue" /> Model
                tata kelola
              </span>
              <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                Lima peran, saling mengunci.
              </h2>
              <p className="mt-4 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
                Blockchain menjadi sumber kebenaran yang tahan rusak; Web2
                menangani hal yang tak perlu on-chain. Wewenang dipisah antara
                Admin, Validator, Auditor, PIC, dan pengguna — tidak ada satu
                pihak pun yang dapat memindahkan dana sendirian.
              </p>
            </Reveal>
            <Reveal delay={0.08} className="grid grid-cols-2 gap-5 self-center">
              {[
                { k: "5", v: "peran dengan wewenang terpisah" },
                { k: "67%", v: "ambang konsensus BFT" },
                { k: "3", v: "tanda tangan / milestone" },
                { k: "100%", v: "aksi finansial di on-chain" },
              ].map((s) => (
                <div key={s.v}>
                  <p className="font-display text-3xl font-semibold tracking-tight text-brand-blue sm:text-4xl">
                    {s.k}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{s.v}</p>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        <section className="px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <Reveal className="max-w-2xl">
              <span className="text-xs font-medium uppercase tracking-[0.25em] text-brand-blue">
                Kebijakan & ketentuan
              </span>
              <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-4xl">
                Aturan main yang dijamin kode.
              </h2>
            </Reveal>
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {POLICIES.map((p, i) => (
                <Reveal key={p.title} delay={i * 0.05}>
                  <article className="group relative h-full overflow-hidden rounded-3xl p-7 transition-transform duration-300 hover:-translate-y-1">
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -left-14 -top-14 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
                      style={{ backgroundColor: `${p.color}33` }}
                    />

                    <span
                      aria-hidden
                      className="relative block h-1 w-10 rounded-full transition-all duration-500 group-hover:w-16"
                      style={{ backgroundColor: p.color }}
                    />

                    <p.icon
                      className="relative mt-5 h-7 w-7 transition-transform duration-300 group-hover:scale-110"
                      style={{ color: p.color }}
                    />

                    <h3 className="relative mt-4 font-display text-lg font-semibold tracking-tight">
                      {p.title}
                    </h3>
                    <p className="relative mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
                      {p.body}
                    </p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-6 sm:px-6">
          <div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-4xl bg-[#080a0f] px-6 py-16 text-white sm:rounded-[2.5rem] sm:px-10 sm:py-20 lg:px-16">
            <Glow
              color="rgba(72,153,234,0.16)"
              size="55%"
              className="left-[-8%] top-[6%] h-[34rem] w-[34rem]"
            />
            <Glow
              color="rgba(103,243,206,0.12)"
              size="55%"
              className="right-[-8%] bottom-[8%] h-[30rem] w-[30rem]"
            />

            <div className="relative max-w-2xl">
              <Reveal>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
                  <FileCode2 className="h-3.5 w-3.5 text-brand-mint" /> On-chain
                </span>
                <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight sm:text-4xl">
                  Kontrak pintar terbuka untuk diverifikasi.
                </h2>
                <p className="mt-4 text-pretty text-sm text-white/60 sm:text-base">
                  Seluruh kontrak ter-deploy di Base Sepolia (chain ID 84532).
                  Klik untuk memeriksa langsung di block explorer — alamat,
                  transaksi, dan kode bisa ditelusuri siapa pun.
                </p>
              </Reveal>
            </div>

            <div className="relative mt-10 grid gap-4">
              {CONTRACTS.map((c, i) => (
                <Reveal key={c.label} delay={i * 0.05}>
                  <ContractRow c={c} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-20 sm:py-24">
          <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2">
            <Reveal>
              <div className="flex h-full flex-col justify-between rounded-3xl border border-black/5 bg-white p-5 sm:p-8">
                <div>
                  <span className="text-xs font-medium uppercase tracking-[0.25em] text-brand-blue">
                    Pembuat
                  </span>
                  <div className="mt-5 flex items-center gap-4">
                    <img
                      src="/media/avatars/xnaizer.jpeg"
                      alt="xnaizer"
                      className="h-14 w-14 rounded-2xl object-cover ring-2 ring-brand-blue/20"
                      loading="lazy"
                    />
                    <div>
                      <p className="font-display text-lg font-semibold tracking-tight">
                        xnaizer
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Pengembang & peneliti
                      </p>
                    </div>
                  </div>
                  <p className="mt-5 text-pretty text-sm leading-relaxed text-muted-foreground">
                    Dirancang dan dibangun sebagai proyek akademik untuk
                    membuktikan bahwa transparansi anggaran publik bisa dijamin
                    secara kriptografis, bukan sekadar dijanjikan.
                  </p>
                </div>
                <a
                  href={GITHUB_PROFILE}
                  target="_blank"
                  rel="noreferrer"
                  className="group mt-6 inline-flex w-fit items-center gap-1.5 rounded-xl border border-black/10 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                >
                  Profil GitHub
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-black/5 bg-foreground p-5 text-background shadow-soft sm:p-8">
                <div>
                  <span className="inline-flex items-center gap-2 text-background/70">
                    <span aria-hidden className="h-5 w-5" style={ghMask} />
                    <span className="text-xs font-medium uppercase tracking-[0.25em]">
                      Sumber terbuka
                    </span>
                  </span>
                  <h3 className="mt-4 font-display text-xl font-semibold tracking-tight sm:mt-5 sm:text-2xl">
                    Dilisensikan MIT.
                  </h3>
                  <p className="mt-3 text-pretty text-sm leading-relaxed text-background/70">
                    Kode monorepo — kontrak, backend, dan frontend — tersedia
                    terbuka. Bebas dipelajari, dimodifikasi, dan digunakan ulang
                    sesuai lisensi MIT.
                  </p>
                </div>
                <a
                  href={GITHUB_REPO}
                  target="_blank"
                  rel="noreferrer"
                  className="group mt-6 inline-flex w-fit items-center gap-1.5 rounded-xl bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-transform hover:scale-[1.03]"
                >
                  <span aria-hidden className="h-4 w-4" style={ghMask} /> Lihat
                  di GitHub
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
              </div>
            </Reveal>
          </div>

          <Reveal className="mx-auto mt-10 max-w-5xl">
            <div
              className={cn(
                "flex flex-col items-center justify-between gap-4 rounded-2xl border border-black/5 bg-muted/40 px-6 py-6 text-center sm:flex-row sm:text-left",
              )}
            >
              <p className="text-sm text-muted-foreground">
                Ingin melihat sistemnya bekerja? Telusuri sirkulasi dana publik
                secara langsung.
              </p>
              <Link
                to="/programs"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-transform hover:scale-[1.03]"
              >
                Buka Explorer publik <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        </section>

        <section className="px-4 pb-20 pt-4 sm:px-6 sm:pb-28">
          <div className="mx-auto max-w-3xl">
            <Reveal className="text-center">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.25em] text-brand-blue">
                <HelpCircle className="h-3.5 w-3.5" /> Pertanyaan umum
              </span>
              <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-4xl">
                Hal yang sering ditanyakan.
              </h2>
            </Reveal>
            <Reveal delay={0.1} className="mt-8">
              <div className="rounded-3xl border border-black/5 bg-white px-6 sm:px-8 dark:bg-white/5">
                {FAQS.map((item, i) => (
                  <FaqRow
                    key={item.q}
                    item={item}
                    open={openFaq === i}
                    onToggle={() => setOpenFaq((cur) => (cur === i ? null : i))}
                  />
                ))}
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
