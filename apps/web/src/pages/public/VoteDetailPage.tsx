import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ShieldCheck, Clock } from "lucide-react";
import { ListShell } from "../../components/layout/ListShell";
import { Badge } from "@/components/ui/badge";
import { BrandLoader } from "../../components/ui/BrandLoader";
import { DarkHero } from "../../components/ui/DarkHero";
import { SectionCard } from "../../components/ui/SectionCard";
import { UserCell } from "../../components/UserCell";
import { VoteDeadline } from "../../components/VoteDeadline";
import { fetchRoleVote } from "../../services/votesApi";
import { impliedTotalFromThreshold } from "../../utils/bft";
import { formatShortenAddress, formatDate } from "../../utils/format";

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <p className="mt-0.5">{value}</p>
    </div>
  );
}

export function VoteDetailPage() {
  const { id } = useParams();
  const voteId = Number(id);
  const {
    data: v,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["role-vote", voteId],
    queryFn: () => fetchRoleVote(voteId),
    enabled: voteId >= 0,
  });

  const count = v?.ballots?.length || v?.voteCount || 0;
  const executed = v?.executed ?? false;
  const total = executed ? impliedTotalFromThreshold(count) : 0;
  const threshold = count;
  const pctFill = total > 0 ? Math.min(100, (count / total) * 100) : 0;
  const pctThreshold = total > 0 ? Math.min(100, (threshold / total) * 100) : 0;

  return (
    <ListShell max="max-w-3xl">
      {isLoading && <BrandLoader />}
      {isError && <Badge variant="destructive">Voting tidak ditemukan.</Badge>}

      {v && (
        <>
          <DarkHero
            back={{ to: "/governance/votes", label: "Voting Peran" }}
            eyebrow="Governance"
            title={`Voting #${v.voteId}`}
            chips={
              <>
                <Badge
                  variant={v.isDevote ? "destructive" : "default"}
                  className="rounded-sm"
                >
                  {v.isDevote ? "Devote" : "Grant"}
                </Badge>
                <Badge
                  variant={v.executed ? "success" : "secondary"}
                  className="rounded-sm"
                >
                  {v.executed ? "Selesai" : "Berjalan"}
                </Badge>
                <VoteDeadline
                  start={v.submittedAt}
                  resolved={v.executed}
                  compact
                />
              </>
            }
          />

          {executed ? (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-300/60 bg-emerald-50 p-4 text-sm dark:border-emerald-500/30 dark:bg-emerald-950/30">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <p className="font-display font-semibold tracking-tight text-emerald-700 dark:text-emerald-300">
                  Voting berhasil
                </p>
                <p className="mt-0.5 text-muted-foreground">
                  Ambang BFT tercapai ({count}/{total} suara) — peran{" "}
                  <b className="text-foreground">{v.roleToTarget}</b>{" "}
                  {v.isDevote ? "dicabut dari" : "diberikan ke"} kandidat dan
                  tercatat on-chain.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-300/60 bg-amber-50 p-4 text-sm dark:border-amber-500/30 dark:bg-amber-950/30">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-display font-semibold tracking-tight text-amber-700 dark:text-amber-300">
                  Voting berjalan
                </p>
                <p className="mt-0.5 text-muted-foreground">
                  Terkumpul {count} suara — menunggu ambang BFT ⌊2N/3⌋+1 sebelum
                  perubahan peran diterapkan.
                </p>
              </div>
            </div>
          )}

          <SectionCard title="Detail Voting">
            <div className="flex flex-col gap-4 text-sm">
              <Field
                label="Peran"
                value={
                  <Badge variant="secondary" className="rounded-sm">
                    {v.roleToTarget}
                  </Badge>
                }
              />
              <div>
                <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Kandidat / Target
                </span>
                <div className="mt-1.5">
                  {v.candidateUser ? (
                    <UserCell
                      user={v.candidateUser}
                      wallet={v.candidate}
                      showRole
                      size="md"
                    />
                  ) : (
                    <span className="font-mono">
                      {formatShortenAddress(v.candidate)}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Diajukan Oleh
                </span>
                <div className="mt-1.5">
                  {v.grantedByUser ? (
                    <UserCell
                      user={v.grantedByUser}
                      wallet={v.grantedBy}
                      showRole
                      size="md"
                    />
                  ) : (
                    <span className="font-mono">
                      {formatShortenAddress(v.grantedBy)}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Suara
                </span>
                {executed ? (
                  <>
                   
                    <div className="relative mt-2.5 w-full">
                      <div className="h-2.5 w-full overflow-hidden rounded-sm bg-muted">
                        <div
                          className="h-full rounded-sm bg-emerald-500 transition-all"
                          style={{ width: `${pctFill}%` }}
                        />
                      </div>
                      <span
                        className="absolute top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/70"
                        style={{ left: `${pctThreshold}%` }}
                        title={`Ambang ${threshold} suara`}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        <b className="font-mono text-foreground">{count}</b> /{" "}
                        {total} suara
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-3 w-0.5 rounded-full bg-foreground/70" />
                        Ambang {threshold} (⌊2N/3⌋+1) tercapai
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="mt-2.5 flex items-center gap-2 text-sm">
                    <b className="font-mono text-foreground">{count}</b>
                    <span className="text-muted-foreground">
                      suara terkumpul · menunggu ambang BFT ⌊2N/3⌋+1
                    </span>
                  </div>
                )}
              </div>
            </div>
          </SectionCard>

          
          <SectionCard
            title="Pemberi Suara"
            eyebrow={`${v.ballots?.length ?? 0} suara`}
            icon={<CheckCircle2 className="h-4 w-4" />}
            accent="#10b981"
          >
            {v.ballots && v.ballots.length > 0 ? (
              <div className="flex flex-col divide-y divide-black/5">
                {v.ballots.map((b, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <UserCell
                      user={b.voter}
                      wallet={b.voter?.walletAddress}
                      showRole
                    />
                    <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(b.votedAt)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Belum ada admin yang memberikan suara.
              </p>
            )}
          </SectionCard>
        </>
      )}
    </ListShell>
  );
}