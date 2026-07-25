import type { Request, Response } from "express";
import { listProgramsQuerySchema } from "../validators/programValidator";
import * as programService from "../services/programService";
import { AppError } from "../utils/AppError";
import response from "../utils/response";
import * as voteService from "../services/voteService";
import * as logService from "../services/logService";
import * as userService from "../services/userService";

export default {
  // GET /api/v1/public/programs
  async listPrograms(req: Request, res: Response): Promise<void> {
    const parsed = listProgramsQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, 400);
    }

    const result = await programService.listPrograms(parsed.data, true);

    response.success(res, result.programs, {
      pagination: result.pagination,
    });
  },

  // GET /api/v1/public/programs/:id
  async detailProgram(req: Request, res: Response): Promise<void> {
    const programId = Number(req.params.id);

    if (!Number.isInteger(programId) || programId < 1) {
      throw new AppError("Invalid program id", 400);
    }

    const program = await programService.getProgramById(programId);

    response.success(res, program);
  },

  // GET /api/v1/public/stats
  async stats(_req: Request, res: Response): Promise<void> {
    const stats = await programService.getPublicStats();

    response.success(res, stats);
  },

  // GET /api/v1/public/programs/:id/withdrawals
  async programWithdrawals(req: Request, res: Response): Promise<void> {
    const programId = Number(req.params.id);

    if (!Number.isInteger(programId) || programId < 1) {
      throw new AppError("Invalid program id", 400);
    }

    const result = await programService.getProgramWithdrawals(programId);

    response.success(res, result);
  },

  // GET /api/v1/public/votes
  async listVotes(req: Request, res: Response): Promise<void> {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    const result = await voteService.listRoleVotes(page, limit);

    response.success(res, result.votes, { pagination: result.pagination });
  },

  // GET /api/v1/public/votes/:id
  async detailVote(req: Request, res: Response): Promise<void> {
    const voteId = Number(req.params.id);

    if (!Number.isInteger(voteId) || voteId < 0) {
      throw new AppError("Invalid vote id", 400);
    }

    const vote = await voteService.getRoleVoteById(voteId);

    response.success(res, vote);
  },

  // GET /api/v1/public/unfreeze-votes
  async listUnfreezeVotes(req: Request, res: Response): Promise<void> {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    const result = await voteService.listUnfreezeVotes(page, limit);

    response.success(res, result.votes, { pagination: result.pagination });
  },

  // GET /api/v1/public/unfreeze-votes/:programId
  async detailUnfreezeVote(req: Request, res: Response): Promise<void> {
    const programId = Number(req.params.programId);

    if (!Number.isInteger(programId) || programId < 1) {
      throw new AppError("Invalid program id", 400);
    }

    const vote = await voteService.getUnfreezeVoteByProgramId(programId);

    response.success(res, vote);
  },

  // GET /api/v1/public/proposal-votes
  async listProposalVotes(req: Request, res: Response): Promise<void> {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    const result = await voteService.listProposalVotes(page, limit);

    response.success(res, result.votes, { pagination: result.pagination });
  },

  // GET /api/v1/public/logs/roles
  async listRoleLogs(req: Request, res: Response): Promise<void> {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    const result = await logService.listRoleChangeLogs(page, limit);

    response.success(res, result.logs, { pagination: result.pagination });
  },

  // GET /api/v1/public/users
  async listUsers(req: Request, res: Response): Promise<void> {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const role =
      typeof req.query.role === "string" ? req.query.role : undefined;
    const sort = req.query.sort === "reputation" ? "reputation" : "recent";

    const result = await userService.listPublicUsers({
      page,
      limit,
      role,
      sort,
    });

    response.success(res, result.users, { pagination: result.pagination });
  },

  // GET /api/v1/public/users/:id
  async userProfile(req: Request, res: Response): Promise<void> {
    const id = req.params.id;

    if (!id) {
      throw new AppError("Invalid user id", 400);
    }

    const user = await userService.getPublicUserProfile(id);

    response.success(res, user);
  },
};
