import express, { type Router } from "express";
import publicController from "../controllers/publicController";
import { readLimiter } from "../middleware/rateLimiter";
import { asyncHandler } from "../utils/asyncHandler";

const router: Router = express.Router();

router.get(
  "/programs",
  readLimiter,
  asyncHandler(publicController.listPrograms),
);

router.get(
  "/programs/:id",
  readLimiter,
  asyncHandler(publicController.detailProgram),
);

router.get("/stats", readLimiter, asyncHandler(publicController.stats));

router.get(
  "/programs/:id/withdrawals",
  readLimiter,
  asyncHandler(publicController.programWithdrawals),
);

router.get("/votes", readLimiter, asyncHandler(publicController.listVotes));

router.get(
  "/votes/:id",
  readLimiter,
  asyncHandler(publicController.detailVote),
);

router.get(
  "/unfreeze-votes",
  readLimiter,
  asyncHandler(publicController.listUnfreezeVotes),
);

router.get(
  "/unfreeze-votes/:programId",
  readLimiter,
  asyncHandler(publicController.detailUnfreezeVote),
);

router.get(
  "/proposal-votes",
  readLimiter,
  asyncHandler(publicController.listProposalVotes),
);

router.get(
  "/logs/roles",
  readLimiter,
  asyncHandler(publicController.listRoleLogs),
);

router.get("/users", readLimiter, asyncHandler(publicController.listUsers));

router.get(
  "/users/:id",
  readLimiter,
  asyncHandler(publicController.userProfile),
);

export default router;
