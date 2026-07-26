import { cacheAside, invalidatePattern } from "../lib/cache";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";
import type { RedemptionStatus } from "@repo/database";
import { getRedemptionNonce, getOnChainRedemption } from "./contractService";

const USER_MINI = {
  id: true,
  name: true,
  username: true,
  walletAddress: true,
  profilePictureURL: true,
  role: true,
} as const;

const SELECT = {
  id: true,
  redemptionId: true,
  picWallet: true,
  amount: true,
  status: true,
  requestedAt: true,
  settledAt: true,
  cancelledAt: true,
  cancelledByPic: true,
  requestTxHash: true,
  settleTxHash: true,
  cancelTxHash: true,
  pic: { select: USER_MINI },
} as const;

const VALID_STATUS = ["PENDING", "SETTLED", "CANCELLED"];

export async function listRedemptions(params: {
  page: number;
  limit: number;
  status?: string;
}) {
  const { page, limit, status } = params;
  const skip = (page - 1) * limit;
  const where =
    status && VALID_STATUS.includes(status)
      ? { status: status as RedemptionStatus }
      : {};
  const cacheKey = `redemptions:list:${status ?? "all"}:${page}:${limit}`;

  return cacheAside(cacheKey, 30, async () => {
    const [redemptions, total] = await Promise.all([
      prisma.redemption.findMany({
        where,
        select: SELECT,
        orderBy: { redemptionId: "desc" },
        skip,
        take: limit,
      }),
      prisma.redemption.count({ where }),
    ]);

    return {
      redemptions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  });
}

export async function getRedemptionById(redemptionId: number) {
  return cacheAside(`redemptions:detail:${redemptionId}`, 30, async () => {
    const row = await prisma.redemption.findUnique({
      where: { redemptionId },
      select: SELECT,
    });

    if (!row) throw new AppError("Redemption not found", 404);

    return row;
  });
}

export async function listRedemptionsByPic(wallet: string) {
  const picWallet = wallet.toLowerCase();
  return cacheAside(`redemptions:pic:${picWallet}`, 30, async () =>
    prisma.redemption.findMany({
      where: { picWallet },
      select: SELECT,
      orderBy: { redemptionId: "desc" },
    }),
  );
}

export async function getRedemptionStats() {
  return cacheAside("redemptions:stats", 30, async () => {
    const [pending, settled, cancelled, settledRows, pendingRows] =
      await Promise.all([
        prisma.redemption.count({ where: { status: "PENDING" } }),
        prisma.redemption.count({ where: { status: "SETTLED" } }),
        prisma.redemption.count({ where: { status: "CANCELLED" } }),
        prisma.redemption.findMany({
          where: { status: "SETTLED" },
          select: { amount: true },
        }),
        prisma.redemption.findMany({
          where: { status: "PENDING" },
          select: { amount: true },
        }),
      ]);
    const sum = (arr: { amount: string }[]) =>
      arr.reduce((a, r) => a + BigInt(r.amount), 0n).toString();
    return {
      pending,
      settled,
      cancelled,
      totalSettledAmount: sum(settledRows),
      totalPendingAmount: sum(pendingRows),
    };
  });
}

const STATUS_BY_INDEX: Record<number, RedemptionStatus> = {
  1: "PENDING",
  2: "SETTLED",
  3: "CANCELLED",
};

export async function runRedemptionReconciliation() {
  const nonce = await getRedemptionNonce();
  let checked = 0,
    synced = 0;

  for (let id = 1; id <= nonce; id++) {
    const oc = await getOnChainRedemption(id);
    if (!oc) continue;
    checked++;

    const onChainStatus = STATUS_BY_INDEX[oc.status];
    if (!onChainStatus) continue;

    const picWallet = oc.pic.toLowerCase();
    const existing = await prisma.redemption.findUnique({
      where: { redemptionId: id },
    });

    if (!existing) {
      const pic = await prisma.user.findUnique({
        where: { walletAddress: picWallet },
        select: { id: true },
      });
      await prisma.redemption.create({
        data: {
          redemptionId: id,
          picWallet,
          amount: oc.amount.toString(),
          status: onChainStatus,
          requestedAt: new Date(Number(oc.createdAt) * 1000),
          settledAt: onChainStatus === "SETTLED" ? new Date() : null,
          cancelledAt: onChainStatus === "CANCELLED" ? new Date() : null,
          picId: pic?.id ?? null,
        },
      });
      synced++;
    } else if (existing.status !== onChainStatus) {
      await prisma.redemption.update({
        where: { redemptionId: id },
        data: {
          status: onChainStatus,
          settledAt:
            onChainStatus === "SETTLED"
              ? existing.settledAt ?? new Date()
              : existing.settledAt,
          cancelledAt:
            onChainStatus === "CANCELLED"
              ? existing.cancelledAt ?? new Date()
              : existing.cancelledAt,
        },
      });
      synced++;
    }
  }

  await invalidatePattern("redemptions:*");
  const summary = { checked, synced, at: new Date().toISOString() };
  console.log("[RECONCILIATION:REDEMPTION]", summary);
  return summary;
}
