import type { Request, Response } from "express";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from "../validators/authValidator";
import * as authService from "../services/authService";
import { AppError } from "../utils/AppError";
import response from "../utils/response";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export default {
  // POST /api/v1/auth/register
  async register(req: Request, res: Response): Promise<void> {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, 400);
    }

    await authService.registerUser(parsed.data);

    response.created(
      res,
      "Registration successful. Check your email to verify.",
    );
  },

  // GET /api/v1/auth/verify-email?token=xxx
  async verifyEmail(req: Request, res: Response): Promise<void> {
    const token = req.query.token;

    if (typeof token !== "string" || !token) {
      throw new AppError("Verification token is required", 400);
    }

    await authService.verifyEmail(token);

    response.success(res, "Email verified successfully. You can now log in.");
  },

  // POST /api/v1/auth/login
  async login(req: Request, res: Response): Promise<void> {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, 400);
    }

    const result = await authService.loginUser(parsed.data);

    res.cookie("token", result.token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    response.success(res, result);
  },

  // POST /api/v1/auth/logout
  async logout(req: Request, res: Response): Promise<void> {
    const user = req.user!;

    const token =
      req.cookies?.token ??
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization!.substring(7)
        : undefined);

    const decoded = token
      ? (jwt.decode(token) as { exp: number } | null)
      : null;
    const exp = decoded?.exp ?? Math.floor(Date.now() / 1000) + 60;

    await authService.logoutUser(user.jti, exp);

    res.clearCookie("token", {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: env.NODE_ENV === "production" ? "none" : "lax",
    });

    response.success(res, "Logged out successfully");
  },

  // GET /api/v1/auth/me
  async me(req: Request, res: Response): Promise<void> {
    const user = req.user!;

    const profile = await authService.getMe(user.id);

    response.success(res, profile);
  },

  // POST /api/v1/auth/resend-verification
  async resendVerification(req: Request, res: Response): Promise<void> {
    const parsed = resendVerificationSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, 400);
    }

    await authService.resendVerification(parsed.data.email);

    response.success(
      res,
      "If the email is registered and not yet verified, a new verification link has been sent.",
    );
  },

  // POST /api/v1/auth/forgot-password
  async forgotPassword(req: Request, res: Response): Promise<void> {
    const parsed = forgotPasswordSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, 400);
    }

    await authService.requestPasswordReset(parsed.data.email);

    response.success(
      res,
      "If the email is registered, a reset link has been sent.",
    );
  },

  // POST /api/v1/auth/reset-password
  async resetPassword(req: Request, res: Response): Promise<void> {
    const parsed = resetPasswordSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, 400);
    }

    await authService.resetPassword(parsed.data.token, parsed.data.newPassword);

    response.success(
      res,
      "Password reset successful. Please log in with your new password.",
    );
  },

  // PATCH /api/v1/auth/me
  async updateMe(req: Request, res: Response): Promise<void> {
    const user = req.user!;

    const parsed = updateProfileSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, 400);
    }

    const updated = await authService.updateProfile(user.id, parsed.data);

    response.success(res, updated);
  },
};
