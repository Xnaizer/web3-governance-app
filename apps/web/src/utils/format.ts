import { VOTE_DURATION_MS } from "@repo/shared";

export function sumAmounts(amounts: (string | null | undefined)[]): bigint {
  return amounts.reduce<bigint>((acc, a) => {
    try {
      return acc + (a ? BigInt(a) : 0n);
    } catch {
      return acc;
    }
  }, 0n);
}

export function formatIDR(amount: string | null | undefined): string {
  if (!amount) return "-";

  try {
    return "Rp. " + BigInt(amount).toLocaleString("id-ID");
  } catch {
    return amount;
  }
}

export function formatShortenAddress(
  address: string | null | undefined,
): string {
  if (!address) return "-";

  return address.length > 10
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : address;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";

  return new Date(iso).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function voteDeadlineInfo(startIso: string | null | undefined): {
  deadline: Date | null;
  deadlineStr: string;
  daysLeft: number;
  expired: boolean;
} {
  if (!startIso) {
    return { deadline: null, deadlineStr: "—", daysLeft: 0, expired: false };
  }
  const start = new Date(startIso);
  const deadline = new Date(start.getTime() + VOTE_DURATION_MS);
  const msLeft = deadline.getTime() - Date.now();
  const daysLeft = Math.ceil(msLeft / 86_400_000);
  return {
    deadline,
    deadlineStr: formatDate(deadline.toISOString()),
    daysLeft: Math.max(0, daysLeft),
    expired: msLeft <= 0,
  };
}