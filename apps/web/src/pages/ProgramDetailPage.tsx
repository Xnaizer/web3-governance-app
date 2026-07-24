import { useState, type ReactNode } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Receipt,
  ArrowDownToLine,
  Wallet,
  PieChart,
  Flag,
  Info,
  ExternalLink,
  Snowflake,
  Scale,
  ImageOff,
  Images,
  Users,
} from "lucide-react";
import { ListShell } from "../components/layout/ListShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useProgram } from "../hooks/usePrograms";
import { StatusChip, IntegrityChip } from "../components/StatusChip";
import { UserCell } from "../components/UserCell";
import { WithdrawalDetailModal } from "../components/ui/WithdrawalDetailModal";
import { StatStrip } from "../components/ui/StatStrip";
import { BrandLoader } from "../components/ui/BrandLoader";
import { DarkHero } from "../components/ui/DarkHero";
import { SectionCard } from "../components/ui/SectionCard";
import { AllocationMeter } from "../components/charts/AllocationMeter";
import { WithdrawalChart } from "../components/charts/WithdrawalChart";
import { ZoomableImage } from "../components/ui/Lightbox";
import { VoteDeadline } from "../components/VoteDeadline";
import {
  useValidatorThreshold,
  useProposalVoteCount,
} from "../hooks/useGovReads";
import { formatIDR, formatShortenAddress, formatDate } from "../utils/format";
import { cn } from "@/utils/cn";
import type { Withdrawal } from "../types/program";

function initials(s: string): string {
  return (
    s
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function ProposalVoteBadge({ programId }: { programId: number }) {
  const { total, threshold } = useValidatorThreshold();
  const count = useProposalVoteCount(programId);
  return (
    <Badge variant={count >= threshold ? "success" : "secondary"}>
      Voting: {count}/{threshold} · {total} validator
    </Badge>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className={mono ? "break-all font-mono text-sm" : ""}>
        {value ?? "—"}
      </p>
    </div>
  );
}

function Section({
  title,
  eyebrow,
  icon,
  accent,
  children,
  className,
}: {
  title: string;
  eyebrow?: string;
  icon?: ReactNode;
  accent?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <SectionCard
      title={title}
      eyebrow={eyebrow}
      icon={icon}
      accent={accent}
      className={cn("shadow-none", className)}
    >
      {children}
    </SectionCard>
  );
}

export function ProgramDetailPage() {
  const { id } = useParams();
  const { data: p, isLoading, isError } = useProgram(Number(id));
  const [selectedW, setSelectedW] = useState<Withdrawal | null>(null);

  const freeze = p?.freezeOutcome;
  const appeal = p?.unfreezeVote;
  const appealResolved = appeal?.resolved ?? false;
  const freezeResolved = freeze ? freeze.outcome !== "PENDING" : false;
  const hasFreezeInfo = !!freeze || !!appeal;
  const unresolved =
    !!p &&
    (p.status === "FROZEN" ||
      (!!appeal && !appealResolved) ||
      (!!freeze && !freezeResolved));

  const freezeCard = freeze ? (
    <Section
      title="Freeze"
      icon={<Snowflake className="h-4 w-4" />}
      accent="#f59e0b"
      className={unresolved ? "border-amber-300 bg-amber-50/40" : ""}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <Field
          label="Auditor"
          value={formatShortenAddress(freeze.auditorWallet)}
          mono
        />
        <Field
          label="Outcome"
          value={
            <Badge
              variant={
                freeze.outcome === "PENDING"
                  ? "warning"
                  : freeze.outcome === "FRAUD_PROVEN"
                  ? "destructive"
                  : "secondary"
              }
              className="rounded-sm"
            >
              {freeze.outcome}
            </Badge>
          }
        />
        <Field label="Frozen At" value={formatDate(freeze.frozenAt)} />
        <Field label="Resolved At" value={formatDate(freeze.resolvedAt)} />
        {freeze.reason && <Field label="Alasan" value={freeze.reason} />}
        {freeze.description && (
          <Field label="Uraian" value={freeze.description} />
        )}
        {freeze.evidenceUrl && (
          <Field
            label="Bukti"
            value={
              <a
                href={freeze.evidenceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-brand-blue hover:underline"
              >
                Lihat bukti →
              </a>
            }
          />
        )}
      </div>
    </Section>
  ) : null;

  const appealCard = appeal ? (
    <Section
      title="Unfreeze Appeal"
      icon={<Scale className="h-4 w-4" />}
      accent="#4899EA"
    >
      {(() => {
        const a = appeal.approveVotes ?? 0;
        const r = appeal.rejectVotes ?? 0;
        const tot = a + r || 1;
        return (
          <div className="mb-4">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-emerald-600">Approve {a}</span>
              <span className="text-destructive">Reject {r}</span>
            </div>
            <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-muted">
              <span
                className="bg-emerald-500"
                style={{ width: `${(a / tot) * 100}%` }}
              />
              <span
                className="bg-destructive"
                style={{ width: `${(r / tot) * 100}%` }}
              />
            </div>
          </div>
        );
      })()}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <Field
          label="Status"
          value={
            <Badge
              variant={appeal.resolved ? "success" : "warning"}
              className="rounded-sm"
            >
              {appeal.resolved ? "Selesai" : "Berjalan"}
            </Badge>
          }
        />
        <Field
          label="Appeal Started"
          value={formatDate(appeal.appealStartedAt)}
        />
      </div>
      <div className="mt-4 border-t border-black/5 pt-3">
        <VoteDeadline
          start={appeal.appealStartedAt}
          resolved={appeal.resolved}
        />
      </div>
    </Section>
  ) : null;

  return (
    <ListShell max="max-w-5xl">
      {isLoading && <BrandLoader />}
      {isError && <Badge variant="destructive">Program tidak ditemukan.</Badge>}

      {p && (
        <>
          {p.isOrphan && (
            <Card className="rounded-2xl border-amber-300 bg-amber-50 dark:bg-amber-950">
              <CardContent className="p-4 text-sm">
                ⚠️ <b>Orphan program</b> — disubmit langsung ke kontrak tanpa
                data Web2. Judul & deskripsi hilang; hanya jejak on-chain yang
                tersisa.
              </CardContent>
            </Card>
          )}

          <DarkHero
            back={{ to: "/programs", label: "Kembali ke Explorer" }}
            eyebrow={`Program #${p.programId}`}
            title={p.title ?? `Program #${p.programId}`}
            gradient={!!p.title}
            subtitle={p.description ?? undefined}
            chips={
              <>
                <StatusChip status={p.status} />
                <IntegrityChip integrity={p.integrity} onDark />
                {p.isOnChain && p.status === "PENDING" && (
                  <ProposalVoteBadge programId={p.programId} />
                )}
              </>
            }
          />

          {p.isOnChain && p.status === "PENDING" && (
            <div className="rounded-xl border border-black/5 bg-muted/30 px-4 py-3">
              <VoteDeadline start={p.submittedAt ?? p.createdAt} />
            </div>
          )}

          <StatStrip
            items={[
              {
                label: "Total Budget",
                color: "#4899EA",
                icon: <Wallet className="h-4 w-4" />,
                value: (
                  <span className="font-mono text-lg">
                    {formatIDR(p.totalBudget)}
                  </span>
                ),
              },
              {
                label: "Teralokasi",
                color: "#67C7A6",
                icon: <PieChart className="h-4 w-4" />,
                value: (
                  <span className="font-mono text-lg">
                    {formatIDR(p.totalAllocatedSoFar)}
                  </span>
                ),
              },
              {
                label: "Milestone",
                color: "#818CF8",
                icon: <Flag className="h-4 w-4" />,
                value: `${p.currentMilestone}/${p.milestoneCount}`,
              },
              {
                label: "Penarikan",
                color: "#38BDF8",
                icon: <ArrowDownToLine className="h-4 w-4" />,
                value: p.withdrawals.length,
              },
            ]}
          />

          {unresolved && hasFreezeInfo && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                <Snowflake className="h-4 w-4 shrink-0" /> Program ini sedang
                dibekukan / dalam proses banding.
              </div>
              {freezeCard}
              {appealCard}
            </div>
          )}

          <Section
            title="Alokasi Anggaran"
            icon={<PieChart className="h-4 w-4" />}
            accent="#4899EA"
          >
            <AllocationMeter
              allocated={p.totalAllocatedSoFar}
              total={p.totalBudget}
            />
          </Section>

          {p.isOnChain && p.proposalVoters.length > 0 && (
            <Section
              title="Validator yang Menyetujui"
              eyebrow={`${p.proposalVoters.length} vote`}
              icon={<Users className="h-4 w-4" />}
              accent="#818CF8"
            >
              <div className="flex flex-col divide-y divide-black/5">
                {p.proposalVoters.map((v) => (
                  <div
                    key={v.wallet}
                    className="flex flex-wrap items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <UserCell user={v.user} wallet={v.wallet} />
                    <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(v.votedAt)}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {p.pic && (
            <Card className="rounded-2xl border-black/5 shadow-none">
              <CardContent className="flex flex-row items-center gap-3 p-4">
                <Avatar className="h-10 w-10">
                  {p.pic.profilePictureURL && (
                    <AvatarImage
                      src={p.pic.profilePictureURL}
                      alt={p.pic.username}
                    />
                  )}
                  <AvatarFallback>
                    {initials(p.pic.name ?? p.pic.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-xs uppercase text-muted-foreground">
                    Penanggung Jawab (PIC)
                  </p>
                  <Link
                    to={`/users/${p.pic.id}`}
                    className="font-semibold text-brand-blue hover:underline"
                  >
                    {p.pic.name ?? p.pic.username}
                  </Link>
                  <span className="ml-2 text-sm text-muted-foreground">
                    Reputasi {p.pic.reputationScore}
                  </span>
                </div>
                <Button asChild size="sm" variant="secondary">
                  <Link to={`/users/${p.pic.id}`}>Lihat profil</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {p.images && p.images.length > 0 && (
            <Section title="Foto Program" icon={<Images className="h-4 w-4" />}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {p.images.map((img, i) => (
                  <ZoomableImage
                    key={img.id}
                    src={img.url}
                    alt={`Foto ${i + 1}`}
                    className="h-32 w-full rounded-lg border object-cover transition-transform group-hover:scale-[1.02]"
                    wrapperClassName="overflow-hidden rounded-lg"
                    loading="lazy"
                  />
                ))}
              </div>
            </Section>
          )}

          <Section
            title="Ringkasan"
            icon={<Info className="h-4 w-4" />}
            accent="#4899EA"
          >
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <Field label="Executor" value={p.executorName} />
              <Field label="Registrasi" value={p.executorRegistration} />
              <Field label="Kategori" value={p.category} />
              <Field label="Institusi" value={p.institutionName} />
              <Field label="Tahun Fiskal" value={p.fiscalYear} />
              <Field
                label="Lokasi"
                value={
                  [p.district, p.regency, p.province]
                    .filter(Boolean)
                    .join(", ") || "—"
                }
              />
              <Field
                label="PIC Wallet"
                value={formatShortenAddress(p.picWallet)}
                mono
              />
              <Field label="Program Hash" value={p.programHash} mono />
              <Field
                label="Tx Hash"
                value={
                  p.txHash ? (
                    <a
                      href={`https://sepolia.basescan.org/tx/${p.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-sm text-brand-blue hover:underline"
                    >
                      {formatShortenAddress(p.txHash)}{" "}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
            </div>
          </Section>

          <Section
            title="Milestones"
            eyebrow={`${p.milestones.length} tahap`}
            icon={<Flag className="h-4 w-4" />}
            accent="#818CF8"
          >
            {p.milestones.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Belum ada milestone.
              </p>
            ) : (
              <div className="flex flex-col">
                {p.milestones.map((m, idx) => (
                  <div
                    key={m.id}
                    className="relative flex gap-4 pb-6 last:pb-0"
                  >
                    {idx < p.milestones.length - 1 && (
                      <span className="absolute bottom-1 left-[5px] top-4 w-px bg-black/10" />
                    )}

                    <span className="relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-brand-blue bg-background" />

                    <div className="min-w-0 flex-1 rounded-xl border border-black/5 bg-muted/20 p-4">
                      <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-brand-blue">
                        Milestone {m.milestoneIndex + 1}
                      </span>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="font-display font-semibold tracking-tight">
                          {m.title ?? `Milestone ${m.milestoneIndex + 1}`}
                        </span>
                        <Badge variant="secondary" className="rounded-sm">
                          {m.status}
                        </Badge>
                        <span className="ml-auto font-mono text-sm font-semibold text-brand-blue">
                          {formatIDR(m.milestoneBudget)}
                        </span>
                      </div>
                      {m.description && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {m.description}
                        </p>
                      )}
                      {m.signatures.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {m.signatures.map((s) => (
                            <Badge
                              key={s.id}
                              variant="outline"
                              className="rounded-full font-mono text-[11px]"
                            >
                              {s.signerRole}:{" "}
                              {formatShortenAddress(s.signerWallet)}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {(m.evidenceURL || m.evidenceHash) && (
                        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-black/5 pt-3 text-xs text-muted-foreground">
                          {m.evidenceURL && (
                            <a
                              href={m.evidenceURL}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-brand-blue hover:underline"
                            >
                              Lihat dokumen bukti →
                            </a>
                          )}
                          {m.evidenceHash && (
                            <span className="break-all font-mono">
                              hash: {formatShortenAddress(m.evidenceHash)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section
            title="Penarikan Dana"
            eyebrow={`${p.withdrawals.length} transaksi`}
            icon={<ArrowDownToLine className="h-4 w-4" />}
            accent="#38BDF8"
          >
            {p.withdrawals.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Belum ada penarikan.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                <WithdrawalChart withdrawals={p.withdrawals} />
                <div className="flex flex-col divide-y divide-black/5">
                {p.withdrawals.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    {w.receiptUrl ? (
                      <img
                        src={w.receiptUrl}
                        alt="receipt"
                        className="h-11 w-11 shrink-0 rounded-lg border border-black/5 object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-dashed border-black/10 text-muted-foreground/40">
                        <ImageOff className="h-4 w-4" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-semibold">
                        {formatIDR(w.amount)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {w.recipientName ?? "—"} · {formatDate(w.timestamp)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="ml-auto shrink-0 gap-1.5 shadow-none"
                      onClick={() => setSelectedW(w)}
                    >
                      <Receipt className="h-4 w-4" /> Lihat receipt
                    </Button>
                  </div>
                ))}
                </div>
              </div>
            )}
          </Section>

          {!unresolved && hasFreezeInfo && (
            <div className="grid gap-4 lg:grid-cols-2">
              {freezeCard}
              {appealCard}
            </div>
          )}
        </>
      )}

      <WithdrawalDetailModal
        w={selectedW}
        isOpen={!!selectedW}
        onClose={() => setSelectedW(null)}
      />
    </ListShell>
  );
}