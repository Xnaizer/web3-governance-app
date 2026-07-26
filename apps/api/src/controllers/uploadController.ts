import type { Request, Response } from "express";
import * as uploadService from "../services/uploadService";
import { AppError } from "../utils/AppError";
import response from "../utils/response";

function requireFile(req: Request) {
  if (!req.file) {
    throw new AppError("File is required", 400);
  }

  return req.file;
}

function requireAsset(req: Request): { url: string; publicId: string } {
  const { url, publicId } = req.body ?? {};

  if (
    typeof url !== "string" ||
    !url ||
    typeof publicId !== "string" ||
    !publicId
  ) {
    throw new AppError("url and publicId are required", 400);
  }

  return { url, publicId };
}

function parseProgramId(req: Request): number {
  const id = Number(req.params.programId);

  if (!Number.isInteger(id) || id < 1) {
    throw new AppError("Invalid program id", 400);
  }

  return id;
}

export default {
  async signProgramImage(req: Request, res: Response): Promise<void> {
    const result = await uploadService.signProgramImageUpload(
      req.user!.id,
      parseProgramId(req),
    );
    response.success(res, result);
  },

  async programImage(req: Request, res: Response): Promise<void> {
    const result = await uploadService.attachProgramImage(
      req.user!.id,
      parseProgramId(req),
      requireAsset(req),
    );

    response.created(res, result);
  },

  async replaceProgramImage(req: Request, res: Response): Promise<void> {
    const imageId = req.params.imageId;

    if (!imageId) {
      throw new AppError("Invalid image id", 400);
    }

    const result = await uploadService.replaceProgramImage(
      req.user!.id,
      parseProgramId(req),
      imageId,
      requireAsset(req),
    );

    response.success(res, result);
  },

  async deleteProgramImage(req: Request, res: Response): Promise<void> {
    const imageId = req.params.imageId;

    if (!imageId) {
      throw new AppError("Invalid image id", 400);
    }

    const result = await uploadService.deleteProgramImage(
      req.user!.id,
      parseProgramId(req),
      imageId,
    );

    response.success(res, result);
  },

  async programPinData(req: Request, res: Response): Promise<void> {
    const result = await uploadService.pinProgramData(
      req.user!.id,
      parseProgramId(req),
    );

    response.success(res, result);
  },

  async milestoneEvidence(req: Request, res: Response): Promise<void> {
    const milestoneId = req.params.milestoneId;

    if (!milestoneId) {
      throw new AppError("Invalid milestone id", 400);
    }

    const result = await uploadService.attachMilestoneEvidence(
      req.user!.id,
      milestoneId,
      requireFile(req),
    );

    response.created(res, result);
  },

  async signWithdrawalReceipt(req: Request, res: Response): Promise<void> {
    const withdrawalId = req.params.withdrawalId;

    if (!withdrawalId) {
      throw new AppError("Invalid withdrawal id", 400);
    }

    const result = await uploadService.signWithdrawalReceiptUpload(
      req.user!.id,
      withdrawalId,
    );
    response.success(res, result);
  },

  async withdrawalReceipt(req: Request, res: Response): Promise<void> {
    const withdrawalId = req.params.withdrawalId;

    if (!withdrawalId) {
      throw new AppError("Invalid withdrawal id", 400);
    }

    const result = await uploadService.attachWithdrawalReceipt(
      req.user!.id,
      withdrawalId,
      requireAsset(req),
    );

    response.created(res, result);
  },

  async signUserAvatar(req: Request, res: Response): Promise<void> {
    const result = await uploadService.signUserAvatarUpload(req.user!.id);
    response.success(res, result);
  },

  async userAvatar(req: Request, res: Response): Promise<void> {
    const result = await uploadService.updateUserAvatar(
      req.user!.id,
      requireAsset(req),
    );
    response.success(res, result);
  },

  async signUserBanner(req: Request, res: Response): Promise<void> {
    const result = await uploadService.signUserBannerUpload(req.user!.id);
    response.success(res, result);
  },

  async userBanner(req: Request, res: Response): Promise<void> {
    const result = await uploadService.updateUserBanner(
      req.user!.id,
      requireAsset(req),
    );
    response.success(res, result);
  },
};