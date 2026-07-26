import { prisma, txDirect } from "../lib/prisma";
import { hashPassword, generateToken, hashToken } from "./hashService";
import { sendTemplateEmail } from "../lib/mailer";
import { AppError } from "../utils/AppError";
import { env } from "../config/env";
import type { RegisterInput } from "../validators/authValidator";
import { comparePassword } from "./hashService";
import { signToken } from "./jwtService";
import { redis } from "../lib/redis";
import type { LoginInput } from "../validators/authValidator";
import type { UpdateProfileInput } from "../validators/authValidator";

const PROFILE_SELECT = {
  id: true,
  username: true,
  email: true,
  role: true,
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
  profilePictureURL: true,
  isActive: true,
  isVerified: true,
  walletAddress: true,
} as const;

export async function registerUser(input: RegisterInput): Promise<void> {
  const email = input.email.toLowerCase().trim();

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        {
          email,
        },
        {
          username: input.username,
        },
      ],
    },
  });

  if (existing) {
    throw new AppError("Email or username already registered", 409);
  }

  const passwordHash = await hashPassword(input.password);
  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await txDirect(async (tx: any) => {
    const user = await tx.user.create({
      data: {
        username: input.username,
        email,
        passwordHash,
        isActive: false,
        role: "USER",
      },
    });

    await tx.verificationToken.create({
      data: {
        tokenHash,
        type: "ACTIVATION",
        expiresAt,
        userId: user.id,
      },
    });
  });

  const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${rawToken}`;

  await sendTemplateEmail({
    to: email,
    subject: "Verify your GovernanceFund account",
    template: "verify-email",
    data: {
      username: input.username,
      verifyUrl,
      year: new Date().getFullYear(),
    },
  });
}

export async function verifyEmail(token: string): Promise<void> {
  const tokenHash = hashToken(token);

  const record = await prisma.verificationToken.findUnique({
    where: {
      tokenHash,
    },
  });

  if (!record || record.type !== "ACTIVATION") {
    throw new AppError("Invalid verification token", 400);
  }

  if (record.expiresAt < new Date()) {
    throw new AppError("Verification token has expired", 400);
  }

  await txDirect(async (tx: any) => {
    await tx.user.update({
      where: {
        id: record.userId,
      },
      data: {
        isActive: true,
      },
    });

    await tx.verificationToken.delete({
      where: {
        id: record.id,
      },
    });
  });
}

export async function loginUser(input: LoginInput): Promise<{ token: string }> {
  const identifier = input.identifier.toLowerCase().trim();

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        {
          email: identifier,
        },
        {
          username: identifier,
        },
      ],
    },
  });

  if (!user) {
    throw new AppError("Invalid credentials", 401);
  }

  if (!user.isActive) {
    throw new AppError("Please verify your email before logging in", 403);
  }

  const valid = await comparePassword(input.password, user.passwordHash);

  if (!valid) {
    throw new AppError("Invalid credentials", 401);
  }

  const { token } = signToken(user.id, user.role);

  return { token };
}

export async function logoutUser(jti: string, exp: number): Promise<void> {
  const remainingTtl = exp - Math.floor(Date.now() / 1000);

  if (remainingTtl > 0) {
    await redis.set(`blocklist:${jti}`, "1", "EX", remainingTtl);
  }
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      isActive: true,
      isVerified: true,
      reputationScore: true,
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
      profilePictureURL: true,
      profileBannerURL: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return user;
}

export async function resendVerification(email: string): Promise<void> {
  const target = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({ where: { email: target } });

  if (!user || user.isActive) return;

  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await txDirect(async (tx: any) => {
    await tx.verificationToken.deleteMany({
      where: { userId: user.id, type: "ACTIVATION" },
    });

    await tx.verificationToken.create({
      data: { tokenHash, type: "ACTIVATION", expiresAt, userId: user.id },
    });
  });

  const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${rawToken}`;

  await sendTemplateEmail({
    to: target,
    subject: "Verify your GovernanceFund account",
    template: "verify-email",
    data: {
      username: user.username,
      verifyUrl,
      year: new Date().getFullYear(),
    },
  });
}

export async function requestPasswordReset(email: string): Promise<void> {
  const forgotEmail = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: {
      email: forgotEmail,
    },
  });

  if (!user) return;

  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.verificationToken.deleteMany({
    where: {
      userId: user.id,
      type: "RESET_PASSWORD",
    },
  });

  await prisma.verificationToken.create({
    data: {
      tokenHash,
      type: "RESET_PASSWORD",
      expiresAt,
      userId: user.id,
    },
  });

  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${rawToken}`;

  await sendTemplateEmail({
    to: forgotEmail,
    subject: "Reset your GovernanceFund password",
    template: "reset-password",
    data: {
      resetUrl,
      year: new Date().getFullYear(),
    },
  });
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  const tokenHash = hashToken(token);

  const record = await prisma.verificationToken.findUnique({
    where: {
      tokenHash,
    },
  });

  if (!record || record.type !== "RESET_PASSWORD") {
    throw new AppError("Invalid reset token", 400);
  }

  if (record.expiresAt < new Date()) {
    throw new AppError("Reset token has expired", 400);
  }

  const passwordHash = await hashPassword(newPassword);

  await txDirect(async (tx: any) => {
    await tx.user.update({
      where: {
        id: record.userId,
      },
      data: {
        passwordHash,
      },
    });

    await tx.verificationToken.delete({
      where: {
        id: record.id,
      },
    });
  });

  await revokeAllUserTokens(record.userId);
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await redis.set(`tokensValidAfter:${userId}`, now.toString());
}

export async function updateProfile(userId: string, data: UpdateProfileInput) {
  try {
    return await prisma.user.update({
      where: { id: userId },
      data,
      select: PROFILE_SELECT,
    });
  } catch (err: any) {
    if (err?.code === "P2002") {
      throw new AppError("NIK or NIP already registered", 409);
    }
    throw err;
  }
}
