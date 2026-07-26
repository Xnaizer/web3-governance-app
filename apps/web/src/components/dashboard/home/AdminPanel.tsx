import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserCell } from "../../UserCell";
import { fetchRoleVotes } from "../../../services/votesApi";
import { fetchRoleLogs } from "../../../services/logsApi";
import { listUsersAdmin } from "../../../services/usersApi";

export function AdminPanel() {
  const logs = useQuery({
    queryKey: ["role-logs", "preview"],
    queryFn: () => fetchRoleLogs({ limit: 6 }),
    staleTime: 30_000,
  });
  const votes = useQuery({
    queryKey: ["role-votes", "preview"],
    queryFn: () => fetchRoleVotes({ limit: 6 }),
    staleTime: 30_000,
  });
  const users = useQuery({
    queryKey: ["admin-users", "preview"],
    queryFn: () => listUsersAdmin({ limit: 20 }),
    staleTime: 30_000,
  });

  const openVotes = (votes.data?.rows ?? []).filter((v) => !v.executed);
  const unverified = (users.data?.users ?? []).filter((u) => !u.isVerified);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card className="flex h-full flex-col rounded-2xl border-black/5 shadow-none">
        <CardHeader className="flex-row items-center justify-between space-y-0 font-display font-semibold tracking-tight">
          <span>Peran Terbaru</span>
          <Button asChild size="sm" variant="ghost">
            <Link to="/governance/roles">Semua</Link>
          </Button>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-3">
          {(logs.data?.rows ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">
              Belum ada perubahan peran.
            </p>
          )}
          {(logs.data?.rows ?? []).slice(0, 5).map((l) => (
            <div key={l.id} className="flex items-center gap-2">
              <UserCell user={l.targetUser} wallet={l.targetWallet} />
              <Badge
                variant={
                  l.changeType.includes("REVOK") ? "destructive" : "secondary"
                }
                className="ml-auto rounded-sm"
              >
                {l.changeType.includes("REVOK") ? "Revoke" : "Grant"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="flex h-full flex-col rounded-2xl border-black/5 shadow-none">
        <CardHeader className="flex-row items-center justify-between space-y-0 font-display font-semibold tracking-tight">
          <span>Voting Berjalan ({openVotes.length})</span>
          <Button asChild size="sm" variant="ghost">
            <Link to="/dashboard/governance">Kelola</Link>
          </Button>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-3">
          {openVotes.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Tidak ada voting berjalan.
            </p>
          )}
          {openVotes.slice(0, 5).map((v) => (
            <div key={v.voteId} className="flex items-center gap-2">
              <UserCell user={v.candidateUser} wallet={v.candidate} />
              <div className="ml-auto flex shrink-0 items-center gap-1.5">
                <Badge
                  variant={v.isDevote ? "destructive" : "default"}
                  className="rounded-sm"
                >
                  {v.isDevote ? "Devote" : "Grant"}
                </Badge>
                <Link
                  to={`/governance/votes/${v.voteId}`}
                  className="font-mono text-xs text-brand-blue hover:underline"
                >
                  #{v.voteId}
                </Link>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="flex h-full flex-col rounded-2xl border-black/5 shadow-none">
        <CardHeader className="flex-row items-center justify-between space-y-0 font-display font-semibold tracking-tight">
          <span>Pending Verifikasi ({unverified.length})</span>
          {unverified.length > 0 && (
            <Button asChild size="sm" variant="ghost">
              <Link to="/dashboard/governance">Verifikasi</Link>
            </Button>
          )}
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-3">
          {unverified.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Semua pengguna sudah terverifikasi.
            </p>
          )}
          {unverified.slice(0, 5).map((u) => (
            <div key={u.id} className="flex items-center gap-2">
              <UserCell user={u} />
              <Badge variant="warning" className="ml-auto rounded-sm">
                unverified
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
