import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserCell } from "../../UserCell";
import { StatusChip } from "../../StatusChip";
import {
  useValidatorThreshold,
  useProposalVoteCount,
} from "../../../hooks/useGovReads";
import { fetchRoleLogs, type RoleLogRow } from "../../../services/logsApi";
import { fetchPublicUsers } from "../../../services/publicUsersApi";
import { listProgramsAuthed } from "../../../services/programApi";
import {
  formatShortenAddress,
  formatIDR,
  formatDate,
} from "../../../utils/format";
import type { ProgramListItem } from "../../../types/program";

function ValidatorProposalRow({
  p,
  total,
  threshold,
}: {
  p: ProgramListItem;
  total: number;
  threshold: number;
}) {
  const count = useProposalVoteCount(p.programId);
  return (
    <div className="flex items-center gap-3 border-b border-black/5 py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <Link
          to={`/programs/${p.programId}`}
          className="flex items-center gap-2"
        >
          <span className="font-mono text-xs text-muted-foreground">
            #{p.programId}
          </span>
          <span className="truncate font-display font-medium tracking-tight hover:text-brand-blue">
            {p.title ?? "(tanpa judul)"}
          </span>
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="font-mono font-semibold text-brand-blue">
            {formatIDR(p.totalBudget)}
          </span>
          <span>· {p.milestoneCount} milestone</span>
          {p.pic ? (
            <UserCell user={p.pic} wallet={p.picWallet} />
          ) : (
            <span className="font-mono">
              {formatShortenAddress(p.picWallet)}
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Badge
          variant={count >= threshold ? "success" : "secondary"}
          className="rounded-sm"
        >
          {count}/{threshold} · {total} val
        </Badge>
        <StatusChip status={p.status} />
      </div>
    </div>
  );
}

export function ValidatorPanel() {
  const programs = useQuery({
    queryKey: ["dash-programs"],
    queryFn: async () => (await listProgramsAuthed({ limit: 100 })).programs,
    staleTime: 30_000,
  });
  const logs = useQuery({
    queryKey: ["role-logs", "validator"],
    queryFn: () => fetchRoleLogs({ limit: 25 }),
    staleTime: 30_000,
  });
  const topPics = useQuery({
    queryKey: ["public-users", "PIC", "reputation"],
    queryFn: () =>
      fetchPublicUsers({ role: "PIC", sort: "reputation", limit: 5 }),
    staleTime: 30_000,
  });
  const { total, threshold } = useValidatorThreshold();

  const pending = (programs.data ?? []).filter(
    (p) => p.isOnChain && p.status === "PENDING",
  );
  const newPics = (() => {
    const seen = new Set<string>();
    const result: RoleLogRow[] = [];
    
    for (const l of logs.data?.rows ?? []) {
      if (l.targetRole !== "PIC") continue;
      const wallet = l.targetWallet?.toLowerCase();
      if (!wallet || seen.has(wallet)) continue;
      seen.add(wallet);
      result.push(l);
      if (result.length >= 6) break;
    }
    return result;
  })();

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="flex h-full flex-col rounded-2xl border-black/5 shadow-none lg:col-span-2">
        <CardHeader className="flex-row items-center justify-between space-y-0 font-display font-semibold tracking-tight">
          <span>Proposal menunggu vote ({pending.length})</span>
          <Button asChild size="sm" variant="ghost">
            <Link to="/dashboard/proposals">Voting</Link>
          </Button>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col">
          {pending.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Tidak ada proposal PENDING.
            </p>
          )}
          {pending.slice(0, 6).map((p) => (
            <ValidatorProposalRow
              key={p.programId}
              p={p}
              total={total}
              threshold={threshold}
            />
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Card className="rounded-2xl border-black/5 shadow-none">
          <CardHeader className="font-display font-semibold tracking-tight">
            PIC baru di-assign
          </CardHeader>
          <CardContent className="flex flex-col">
            {newPics.length === 0 && (
              <p className="text-sm text-muted-foreground">Belum ada.</p>
            )}
            {newPics.map((l) => (
              <div
                key={l.id}
                className="flex items-center gap-2 border-b border-black/5 py-2.5 last:border-0"
              >
                <UserCell
                  user={l.targetUser}
                  wallet={l.targetWallet}
                  showRole
                />
                <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">
                  {formatDate(l.createdAt)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-black/5 shadow-none">
          <CardHeader className="flex-row items-center justify-between space-y-0 font-display font-semibold tracking-tight">
            <span>PIC reputasi tertinggi</span>
            <Button asChild size="sm" variant="ghost">
              <Link to="/users">Direktori</Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col">
            {(topPics.data?.users ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Belum ada PIC.</p>
            )}
            {(topPics.data?.users ?? []).map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-2 border-b border-black/5 py-2.5 last:border-0"
              >
                <UserCell user={u} />
                <Badge variant="success" className="ml-auto rounded-sm">
                  {u.reputationScore}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}