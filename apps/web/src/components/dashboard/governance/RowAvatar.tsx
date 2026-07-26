import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { AdminUser } from "../../../services/usersApi";

export function initials(s: string): string {
  return (
    s
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function RowAvatar({ u }: { u: AdminUser }) {
  return (
    <Avatar className="h-9 w-9 shrink-0">
      {u.profilePictureURL && (
        <AvatarImage src={u.profilePictureURL} alt={u.name ?? u.username} />
      )}
      <AvatarFallback className="text-[10px]">
        {initials(u.name ?? u.username)}
      </AvatarFallback>
    </Avatar>
  );
}

