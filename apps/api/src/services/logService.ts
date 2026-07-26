import { cacheAside } from "../lib/cache";
import { prisma } from "../lib/prisma";

const USER_MINI = {
  id: true,
  name: true,
  username: true,
  walletAddress: true,
  profilePictureURL: true,
  role: true,
} as const;

export async function listRoleChangeLogs(page: number, limit: number) {
  const skip = (page - 1) * limit;
  const cacheKey = `logs:roles:${page}:${limit}`;

  return cacheAside(cacheKey, 30, async () => {
    const [logs, total] = await Promise.all([
      prisma.roleChangeLog.findMany({
        select: {
          id: true,
          changeType: true,
          targetWallet: true,
          targetRole: true,
          actorWallet: true,
          txHash: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.roleChangeLog.count(),
    ]);

    const wallets = [
      ...new Set(
        logs.flatMap(
          (log) =>
            [log.targetWallet, log.actorWallet].filter(Boolean) as string[],
        ),
      ),
    ].map((item) => item.toLowerCase());

    const users = wallets.length
      ? await prisma.user.findMany({
          where: {
            walletAddress: { in: wallets },
          },
          select: USER_MINI,
        })
      : [];

    const byWallet = new Map(
      users.map((user) => [user.walletAddress!.toLowerCase(), user]),
    );

    const enriched = logs.map((log) => ({
      ...log,
      targetUser: log.targetWallet
        ? byWallet.get(log.targetWallet.toLowerCase()) ?? null
        : null,
      actorUser: log.actorWallet
        ? byWallet.get(log.actorWallet.toLowerCase()) ?? null
        : null,
    }));

    return {
      logs: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  });
}
