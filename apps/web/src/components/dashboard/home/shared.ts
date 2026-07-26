export const REPUTATION_BLOCKED = 35;

export function reputationTone(score: number) {
  if (score < REPUTATION_BLOCKED)
    return { tone: "danger" as const, label: "BLOCKED" };
  if (score < 50) return { tone: "warning" as const, label: "WATCH" };
  return { tone: "success" as const, label: "OK" };
}
