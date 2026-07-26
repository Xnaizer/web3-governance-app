import type { Request, Response } from "express";
import {
  createProgramSchema,
  listProgramsQuerySchema,
} from "../validators/programValidator";
import { freezeEvidenceSchema } from "../validators/freezeValidator";
import * as programService from "../services/programService";
import * as freezeService from "../services/freezeService";
import { AppError } from "../utils/AppError";
import response from "../utils/response";

export default {
  // POST /api/v1/programs
  async create(req: Request, res: Response): Promise<void> {
    const user = req.user!;

    const parsed = createProgramSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, 400);
    }

    const result = await programService.createProgram(user.id, parsed.data);

    response.created(res, result);
  },

  // GET /api/v1/programs
  async list(req: Request, res: Response): Promise<void> {
    const parsed = listProgramsQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, 400);
    }

    const result = await programService.listPrograms(parsed.data);

    response.success(res, result.programs, { pagination: result.pagination });
  },

  // GET /api/v1/programs/:id
  async detail(req: Request, res: Response): Promise<void> {
    const programId = Number(req.params.id);

    if (!Number.isInteger(programId) || programId < 1) {
      throw new AppError("Invalid program id", 400);
    }

    const program = await programService.getProgramById(programId);

    response.success(res, program);
  },

  // GET /api/v1/programs/:id/onchain-payload
  async onchainPayload(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const programId = Number(req.params.id);

    if (!Number.isInteger(programId) || programId < 1) {
      throw new AppError("Invalid program id", 400);
    }

    const payload = await programService.getSubmissionPayload(
      user.id,
      programId,
    );

    response.success(res, payload);
  },

  // GET /api/v1/programs/my-proposal-votes
  async myProposalVotes(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const result = await programService.getMyProposalVotes(user.id);
    response.success(res, result);
  },

  // POST /api/v1/programs/:id/freeze-evidence
  async freezeEvidence(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    const programId = Number(req.params.id);

    if (!Number.isInteger(programId) || programId < 1) {
      throw new AppError("Invalid program id", 400);
    }

    const parsed = freezeEvidenceSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, 400);
    }

    const result = await freezeService.submitFreezeEvidence(
      programId,
      user.id,
      parsed.data,
    );

    response.success(res, result);
  },
};
