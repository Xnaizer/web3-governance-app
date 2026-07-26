import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Folder, Award, Gavel, Scale, Snowflake } from "lucide-react";
import { ListShell } from "../../components/layout/ListShell";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BrandLoader } from "../../components/ui/BrandLoader";
import { DarkHero } from "../../components/ui/DarkHero";
import { SectionCard } from "../../components/ui/SectionCard";
import { StatusChip } from "../../components/StatusChip";
import { fetchPublicUser } from "../../services/publicUsersApi";
import type { ProgramStatus } from "../../types/program";
import {
  formatIDR,
  formatShortenAddress,
  formatDate,
} from "../../utils/format";

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

export function UserDetailPage() {
  const { id } = useParams();
  const {
    data: u,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["public-user", id],
    queryFn: () => fetchPublicUser(id!),
    enabled: !!id,
  });

  return (
    <ListShell max="max-w-4xl">
      {isLoading && <BrandLoader />}
      {isError && (
        <Badge variant="destructive">Pengguna tidak ditemukan.</Badge>
      )}

      {u && (
        <>
          <DarkHero
            back={{ to: "/users", label: "Direktori Pengguna" }}
            eyebrow={u.role}
            title={u.name ?? u.username}
            gradient
            subtitle={
              u.role === "PIC"
                ? `Profil publik PIC · ${u.programs.length} program · reputasi ${u.reputationScore}`
                : `Profil publik ${u.role.toLowerCase()} · reputasi ${
                    u.reputationScore
                  }`
            }
            bannerUrl={u.profileBannerURL}
            chips={
              <>
                {u.isVerified && (
                  <Badge variant="success" className="rounded-sm">
                    Verified
                  </Badge>
                )}
                <Badge className="rounded-sm border-transparent bg-white/10 text-white">
                  Reputasi {u.reputationScore}
                </Badge>
              </>
            }
          >
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <Avatar className="h-14 w-14 text-base ring-2 ring-white/20 sm:h-16 sm:w-16 sm:text-lg">
                {u.profilePictureURL && (
                  <AvatarImage src={u.profilePictureURL} alt={u.username} />
                )}
                <AvatarFallback className="bg-white/10 text-white">
                  {initials(u.name ?? u.username)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="font-mono text-sm text-white/55">
                  {u.walletAddress
                    ? formatShortenAddress(u.walletAddress)
                    : "tanpa wallet"}
                </p>
                <p className="text-sm text-white/60">
                  {[u.position, u.institution, u.nationality]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
                <p className="text-xs text-white/40">
                  Bergabung {formatDate(u.createdAt)}
                </p>
              </div>
            </div>
          </DarkHero>

          {u.role === "PIC" && (
            <SectionCard
              title={`Program (${u.programs.length})`}
              icon={<Folder className="h-4 w-4" />}
              accent="#4899EA"
              className="shadow-none"
            >
              <div className="flex flex-col gap-1">
                {u.programs.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Belum ada program.
                  </p>
                )}
                {u.programs.map((p) => (
                  <Link
                    key={p.programId}
                    to={`/programs/${p.programId}`}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-brand-blue/4"
                  >
                    <span className="font-mono text-xs text-muted-foreground">
                      #{p.programId}
                    </span>
                    <span className="truncate font-display font-medium tracking-tight">
                      {p.title ?? "(draft)"}
                    </span>
                    <StatusChip status={p.status as ProgramStatus} />
                    <span className="ml-auto font-mono text-muted-foreground">
                      {formatIDR(p.totalBudget)}
                    </span>
                  </Link>
                ))}
              </div>
            </SectionCard>
          )}

          {u.role === "ADMIN" &&
            u.roleVoteBallots &&
            u.roleVoteBallots.length > 0 && (
              <SectionCard
                title={`Voting Peran (${u.roleVoteBallots.length})`}
                icon={<Gavel className="h-4 w-4" />}
                accent="#4899EA"
                className="shadow-none"
              >
                <div className="flex flex-col">
                  {u.roleVoteBallots.map((b, i) => (
                    <div
                      key={i}
                      className="flex flex-wrap items-center gap-2 border-b border-black/5 py-2.5 text-sm last:border-0"
                    >
                      <Link
                        to={`/governance/votes/${b.roleVote.voteId}`}
                        className="font-mono text-xs text-brand-blue hover:underline"
                      >
                        #{b.roleVote.voteId}
                      </Link>
                      <Badge
                        variant={
                          b.roleVote.isDevote ? "destructive" : "default"
                        }
                        className="rounded-sm"
                      >
                        {b.roleVote.isDevote ? "Devote" : "Grant"}
                      </Badge>
                      <Badge variant="secondary" className="rounded-sm">
                        {b.roleVote.roleToTarget}
                      </Badge>
                      <span className="font-mono text-xs text-muted-foreground">
                        {formatShortenAddress(b.roleVote.candidate)}
                      </span>
                      <Badge
                        variant={b.roleVote.executed ? "success" : "secondary"}
                        className="rounded-sm"
                      >
                        {b.roleVote.executed ? "Selesai" : "Berjalan"}
                      </Badge>
                      <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">
                        {formatDate(b.votedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

          {u.role === "VALIDATOR" &&
            u.unfreezeBallots &&
            u.unfreezeBallots.length > 0 && (
              <SectionCard
                title={`Suara Banding Unfreeze (${u.unfreezeBallots.length})`}
                icon={<Scale className="h-4 w-4" />}
                accent="#4899EA"
                className="shadow-none"
              >
                <div className="flex flex-col">
                  {u.unfreezeBallots.map((b, i) => (
                    <div
                      key={i}
                      className="flex flex-wrap items-center gap-2 border-b border-black/5 py-2.5 text-sm last:border-0"
                    >
                      <Link
                        to={`/programs/${b.unfreezeVote.programId}`}
                        className="flex min-w-0 items-center gap-2"
                      >
                        <span className="font-mono text-xs text-muted-foreground">
                          #{b.unfreezeVote.programId}
                        </span>
                        <span className="truncate font-display font-medium tracking-tight hover:text-brand-blue">
                          {b.unfreezeVote.program?.title ?? "(tanpa judul)"}
                        </span>
                      </Link>
                      <Badge
                        variant={b.approve ? "success" : "destructive"}
                        className="rounded-sm"
                      >
                        {b.approve ? "Setuju" : "Tolak"}
                      </Badge>
                      <Badge
                        variant={
                          b.unfreezeVote.resolved ? "secondary" : "warning"
                        }
                        className="rounded-sm"
                      >
                        {b.unfreezeVote.resolved ? "Selesai" : "Berjalan"}
                      </Badge>
                      <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">
                        {formatDate(b.votedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

          {u.role === "AUDITOR" && u.freezes && u.freezes.length > 0 && (
            <SectionCard
              title={`Program Dibekukan (${u.freezes.length})`}
              icon={<Snowflake className="h-4 w-4" />}
              accent="#f59e0b"
              className="shadow-none"
            >
              <div className="flex flex-col">
                {u.freezes.map((f) => (
                  <div
                    key={f.programId}
                    className="flex flex-wrap items-center gap-2 border-b border-black/5 py-2.5 text-sm last:border-0"
                  >
                    <Link
                      to={`/programs/${f.programId}`}
                      className="flex min-w-0 items-center gap-2"
                    >
                      <span className="font-mono text-xs text-muted-foreground">
                        #{f.programId}
                      </span>
                      <span className="truncate font-display font-medium tracking-tight hover:text-brand-blue">
                        {f.program?.title ?? "(tanpa judul)"}
                      </span>
                    </Link>
                    <Badge
                      variant={
                        f.outcome === "FRAUD_PROVEN"
                          ? "destructive"
                          : f.outcome === "PENDING"
                          ? "warning"
                          : "secondary"
                      }
                      className="rounded-sm"
                    >
                      {f.outcome}
                    </Badge>
                    {f.program && (
                      <span className="font-mono text-xs text-muted-foreground">
                        {formatIDR(f.program.totalBudget)}
                      </span>
                    )}
                    <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(f.frozenAt)}
                    </span>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {u.reputationLogs && u.reputationLogs.length > 0 && (
            <SectionCard
              title="Riwayat Reputasi"
              icon={<Award className="h-4 w-4" />}
              accent="#C084FC"
              className="shadow-none"
            >
              <div className="flex flex-col gap-1.5 text-sm">
                {u.reputationLogs.map((l, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Badge
                      variant={l.change >= 0 ? "success" : "destructive"}
                      className="rounded-sm font-mono"
                    >
                      {l.change >= 0 ? `+${l.change}` : l.change}
                    </Badge>
                    <span className="text-muted-foreground">{l.reason}</span>
                    <span className="font-mono text-muted-foreground/70">
                      → {l.scoreAfter}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground/70">
                      {formatDate(l.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </>
      )}
    </ListShell>
  );
}
