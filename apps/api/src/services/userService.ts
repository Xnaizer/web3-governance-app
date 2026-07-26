import { cacheAside } from "../lib/cache";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";
import { ListUserQueryInput } from "../validators/userValidator";

const PUBLIC_USER_SELECT = {
  id: true,
  username: true,
  name: true,
  role: true,
  walletAddress: true,
  isVerified: true,
  reputationScore: true,
  institution: true,
  position: true,
  nationality: true,
  profilePictureURL: true,
  profileBannerURL: true,
  createdAt: true,
} as const;

export async function listUsers(query: ListUserQueryInput) {
  const { page, role, limit, isVerified } = query;
  const skip = (page - 1) * limit;

  const where = {
    ...(role !== undefined ? { role } : {}),
    ...(isVerified !== undefined ? { isVerified } : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        isVerified: true,
        walletAddress: true,
        name: true,
        reputationScore: true,
        profilePictureURL: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

const PUBLIC_USER_LIST_SELECT = {
  id: true,
  username: true,
  name: true,
  role: true,
  walletAddress: true,
  isVerified: true,
  reputationScore: true,
  profilePictureURL: true,
  institution: true,
  createdAt: true,
} as const;

export async function listPublicUsers(query: {
  page: number;
  limit: number;
  role?: string;
  sort?: "reputation" | "recent";
}) {
  const { page, limit, role, sort } = query;
  const skip = (page - 1) * limit;

  const where =
    role && role !== "USER"
      ? { role: role as any }
      : { role: { not: "USER" as any } };
  const orderBy =
    sort === "reputation"
      ? { reputationScore: "desc" as const }
      : { createdAt: "desc" as const };

  const cacheKey = `public:users:${role ?? "all"}:${
    sort ?? "recent"
  }:${page}:${limit}`;
  return cacheAside(cacheKey, 30, async () => {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: PUBLIC_USER_LIST_SELECT,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);
    return {
      users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  });
}

const REQUIRED_PROFILE_FIELDS = [
  "name",
  "nik",
  "institution",
  "position",
  "phone",
  "address",
  "birthPlace",
  "birthDate",
  "nationality",
] as const;

function missingProfileFields(user: Record<string, unknown>): string[] {
  return REQUIRED_PROFILE_FIELDS.filter((f) => {
    const v = user[f];
    return v === null || v === undefined || v === "";
  });
}

const ADMIN_USER_DETAIL_SELECT = {
  id: true,
  username: true,
  email: true,
  role: true,
  isActive: true,
  isVerified: true,
  walletAddress: true,
  name: true,
  nik: true,
  nip: true,
  institution: true,
  position: true,
  birthPlace: true,
  birthDate: true,
  address: true,
  phone: true,
  nationality: true,
  reputationScore: true,
  profilePictureURL: true,
  profileBannerURL: true,
  createdAt: true,
} as const;

export async function getAdminUserDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...ADMIN_USER_DETAIL_SELECT,
      _count: { select: { programs: true } },
    },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const { _count, ...rest } = user;
  const missingFields = missingProfileFields(rest as Record<string, unknown>);

  return {
    ...rest,
    programsCount: _count.programs,
    missingFields,
    isProfileComplete: missingFields.length === 0,
  };
}

export async function setVerified(userId: string, isVerified: boolean) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (isVerified && !user.isActive) {
    throw new AppError(
      "User must verify email before identity verification",
      400,
    );
  }

  if (isVerified) {
    const missing = REQUIRED_PROFILE_FIELDS.filter((f) => {
      const v = (user as Record<string, unknown>)[f];
      return v === null || v === undefined || v === "";
    });

    if (missing.length > 0) {
      throw new AppError(
        `Profile not complete yet. Required field: ${missing.join(", ")}`,
        400,
      );
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isVerified },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      isActive: true,
      isVerified: true,
      name: true,
    },
  });

  return updated;
}

export async function getPublicUserProfile(userId: string) {
  const cacheKey = `public:user:${userId}`;

  return cacheAside(cacheKey, 30, async () => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...PUBLIC_USER_SELECT,
        programs: {
          select: {
            programId: true,
            title: true,
            status: true,
            displayTab: true,
            totalBudget: true,
            integrity: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    let roleVoteBallots = undefined;
    let unfreezeBallots = undefined;
    let reputationLogs = undefined;
    let freezes = undefined;

    if (user.role === "ADMIN") {
      roleVoteBallots = await prisma.roleVoteBallot.findMany({
        where: { voterId: userId },
        select: {
          votedAt: true,
          roleVote: {
            select: {
              voteId: true,
              candidate: true,
              roleToTarget: true,
              isDevote: true,
              executed: true,
            },
          },
        },
        orderBy: { votedAt: "desc" },
        take: 50,
      });
    } else if (user.role === "VALIDATOR") {
      unfreezeBallots = await prisma.unfreezeVoteBallot.findMany({
        where: { voterId: userId },
        select: {
          approve: true,
          votedAt: true,
          unfreezeVote: {
            select: {
              programId: true,
              resolved: true,
              program: {
                select: { title: true, status: true, totalBudget: true },
              },
            },
          },
        },
        orderBy: { votedAt: "desc" },
        take: 50,
      });
    } else if (user.role === "AUDITOR" || user.role === "PIC") {
      reputationLogs = await prisma.reputationLog.findMany({
        where: { userId },
        select: {
          change: true,
          reason: true,
          scoreAfter: true,
          programId: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      if (user.role === "AUDITOR" && user.walletAddress) {
        freezes = await prisma.freezeOutcome.findMany({
          where: { auditorWallet: user.walletAddress },
          select: {
            programId: true,
            outcome: true,
            reason: true,
            frozenAt: true,
            resolvedAt: true,
            program: {
              select: { title: true, status: true, totalBudget: true },
            },
          },
          orderBy: { frozenAt: "desc" },
          take: 50,
        });
      }
    }

    return {
      ...user,
      roleVoteBallots,
      unfreezeBallots,
      reputationLogs,
      freezes,
    };
  });
}
