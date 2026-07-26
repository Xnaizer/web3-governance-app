import express, { type Router } from "express";
import programController from "../controllers/programController";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import { mutationLimiter, readLimiter } from "../middleware/rateLimiter";
import { asyncHandler } from "../utils/asyncHandler";

const router: Router = express.Router();

router.post(
  "/",
  mutationLimiter,
  asyncHandler(authMiddleware),
  requireRole(["PIC"]),
  asyncHandler(programController.create),
);

router.get(
  "/",
  readLimiter,
  asyncHandler(authMiddleware),
  asyncHandler(programController.list),
);

router.get(
  "/my-proposal-votes",
  readLimiter,
  asyncHandler(authMiddleware),
  requireRole(["VALIDATOR"]),
  asyncHandler(programController.myProposalVotes),
);

router.get(
  "/:id",
  readLimiter,
  asyncHandler(authMiddleware),
  asyncHandler(programController.detail),
);

router.get(
  "/:id/onchain-payload",
  readLimiter,
  asyncHandler(authMiddleware),
  requireRole(["PIC"]),
  asyncHandler(programController.onchainPayload),
);

router.post(
  "/:id/freeze-evidence",
  mutationLimiter,
  asyncHandler(authMiddleware),
  requireRole(["AUDITOR"]),
  asyncHandler(programController.freezeEvidence),
);

export default router;
