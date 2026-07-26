import express, { type Router } from "express";
import uploadController from "../controllers/uploadController";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import { mutationLimiter } from "../middleware/rateLimiter";
import { documentUpload } from "../middleware/upload";
import { asyncHandler } from "../utils/asyncHandler";

const router: Router = express.Router();

router.post(
  "/program/:programId/image/sign",
  mutationLimiter,
  asyncHandler(authMiddleware),
  requireRole(["PIC"]),
  asyncHandler(uploadController.signProgramImage),
);

router.post(
  "/withdrawal/:withdrawalId/receipt/sign",
  mutationLimiter,
  asyncHandler(authMiddleware),
  requireRole(["PIC"]),
  asyncHandler(uploadController.signWithdrawalReceipt),
);

router.post(
  "/user/avatar/sign",
  mutationLimiter,
  asyncHandler(authMiddleware),
  asyncHandler(uploadController.signUserAvatar),
);

router.post(
  "/user/banner/sign",
  mutationLimiter,
  asyncHandler(authMiddleware),
  asyncHandler(uploadController.signUserBanner),
);

router.post(
  "/program/:programId/image",
  mutationLimiter,
  asyncHandler(authMiddleware),
  requireRole(["PIC"]),
  asyncHandler(uploadController.programImage),
);

router.put(
  "/program/:programId/image/:imageId",
  mutationLimiter,
  asyncHandler(authMiddleware),
  requireRole(["PIC"]),
  asyncHandler(uploadController.replaceProgramImage),
);

router.delete(
  "/program/:programId/image/:imageId",
  mutationLimiter,
  asyncHandler(authMiddleware),
  requireRole(["PIC"]),
  asyncHandler(uploadController.deleteProgramImage),
);

router.post(
  "/program/:programId/pin-data",
  mutationLimiter,
  asyncHandler(authMiddleware),
  requireRole(["PIC"]),
  asyncHandler(uploadController.programPinData),
);

router.post(
  "/milestone/:milestoneId/evidence",
  mutationLimiter,
  asyncHandler(authMiddleware),
  requireRole(["PIC"]),
  documentUpload,
  asyncHandler(uploadController.milestoneEvidence),
);

router.post(
  "/withdrawal/:withdrawalId/receipt",
  mutationLimiter,
  asyncHandler(authMiddleware),
  requireRole(["PIC"]),
  asyncHandler(uploadController.withdrawalReceipt),
);

router.post(
  "/user/avatar",
  mutationLimiter,
  asyncHandler(authMiddleware),
  asyncHandler(uploadController.userAvatar),
);

router.post(
  "/user/banner",
  mutationLimiter,
  asyncHandler(authMiddleware),
  asyncHandler(uploadController.userBanner),
);

export default router;