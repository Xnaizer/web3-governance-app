import { Badge } from "@/components/ui/badge";
import { useRoleVoteCount } from "../../../hooks/useGovReads";

export function RoleVoteCount({
  voteId,
  threshold,
}: {
  voteId: number;
  threshold: number;
}) {
  const count = useRoleVoteCount(voteId);
  return (
    <Badge
      variant={count >= threshold ? "success" : "secondary"}
      className="rounded-sm"
    >
      {count}/{threshold} suara
    </Badge>
  );
}

