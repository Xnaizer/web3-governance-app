import express, { type Router } from "express";
import authController from "../controllers/authController";
import { asyncHandler } from "../utils/asyncHandler";
import { authMiddleware } from "../middleware/auth";
import { authLimiter, mutationLimiter, readLimiter } from "../middleware/rateLimiter";
import { verifyTurnstile } from "../middleware/turnstile";

const router: Router  = express.Router();

router.post(
    "/register",
    authLimiter,
    asyncHandler(verifyTurnstile),
    asyncHandler(authController.register)
);

router.get(
    "/verify-email", 
    authLimiter, 
    asyncHandler(authController.verifyEmail)
);

router.post(
    "/login",
    authLimiter,
    asyncHandler(verifyTurnstile),
    asyncHandler(authController.login)
);

router.post(
    "/logout", 
    asyncHandler(authMiddleware), 
    asyncHandler(authController.logout)
);

router.get(
    "/me",
    readLimiter,
    asyncHandler(authMiddleware),
    asyncHandler(authController.me)
);

router.post(
    "/resend-verification",
    authLimiter,
    asyncHandler(verifyTurnstile),
    asyncHandler(authController.resendVerification)
);

router.post(
    "/forgot-password",
    authLimiter,
    asyncHandler(verifyTurnstile),
    asyncHandler(authController.forgotPassword)
);

router.post(
    "/reset-password",
    authLimiter,
    asyncHandler(verifyTurnstile),
    asyncHandler(authController.resetPassword)
);

router.patch(
    "/me",
    mutationLimiter,
    asyncHandler(authMiddleware),
    asyncHandler(authController.updateMe)
);


export default router;