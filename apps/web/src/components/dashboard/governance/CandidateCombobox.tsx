import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { cn } from "@/utils/cn";
import { initials } from "./RowAvatar";
import { formatShortenAddress } from "../../../utils/format";
import type { AdminUser } from "../../../services/usersApi";

export function CandidateCombobox({
  candidates,
  value,
  onChange,
}: {
  candidates: AdminUser[];
  value: string;
  onChange: (wallet: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = candidates.find((u) => u.walletAddress === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span className="flex min-w-0 items-center gap-2">
              <Avatar className="h-6 w-6 shrink-0">
                {selected.profilePictureURL && (
                  <AvatarImage
                    src={selected.profilePictureURL}
                    alt={selected.name ?? selected.username}
                  />
                )}
                <AvatarFallback className="text-[9px]">
                  {initials(selected.name ?? selected.username)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">
                {selected.name ?? selected.username}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">Cari nama / wallet…</span>
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Cari nama / wallet…" />
          <CommandList>
            <CommandEmpty>Tidak ada kandidat.</CommandEmpty>
            <CommandGroup>
              {candidates.map((u) => (
                <CommandItem
                  key={u.walletAddress!}
                  value={`${u.name ?? u.username} ${u.walletAddress}`}
                  onSelect={() => {
                    onChange(u.walletAddress!);
                    setOpen(false);
                  }}
                >
                  <Avatar className="h-7 w-7 shrink-0">
                    {u.profilePictureURL && (
                      <AvatarImage
                        src={u.profilePictureURL}
                        alt={u.name ?? u.username}
                      />
                    )}
                    <AvatarFallback className="text-[10px]">
                      {initials(u.name ?? u.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm">
                      {u.name ?? u.username} ·{" "}
                      <span className="text-muted-foreground">{u.role}</span>
                      {u.isVerified ? " ✓" : ""}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {formatShortenAddress(u.walletAddress!)}
                    </span>
                  </div>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === u.walletAddress ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

