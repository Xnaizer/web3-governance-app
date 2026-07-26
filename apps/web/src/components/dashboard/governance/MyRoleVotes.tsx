import { Link } from "react-router-dom";
import { Gavel } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QueryState } from "../../ui/QueryState";
import { useMyActivity } from "../../../hooks/useMyActivity";
import { formatShortenAddress, formatDate } from "../../../utils/format";

export function MyRoleVotes() {
  const { data, isLoading, isError, refetch } = useMyActivity();
  const ballots = data?.roleVoteBallots ?? [];
  return (
    <Card className="rounded-2xl border-black/5 shadow-none">
      <CardHeader className="flex-row items-center gap-2 space-y-0 font-display font-semibold tracking-tight">
        <Gavel className="h-4 w-4 text-brand-blue" />
        Role yang Saya Vote
        <Badge variant="secondary" className="ml-auto rounded-sm">
          {ballots.length}
        </Badge>
      </CardHeader>
      <CardContent>
        <QueryState
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          isEmpty={ballots.length === 0}
          emptyIcon={<Gavel />}
          emptyTitle="Belum ada voting peran"
          emptyDescription="Usulan perubahan peran yang Anda setujui akan tercatat di sini."
        >
          <div className="flex flex-col">
            {ballots.map((b, i) => (
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
                  variant={b.roleVote.isDevote ? "destructive" : "default"}
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
        </QueryState>
      </CardContent>
    </Card>
  );
}

