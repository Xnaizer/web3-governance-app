import { api } from "../lib/api";

interface Envelope<T> {
  data: T;
  error: string | null;
  meta: Record<string, unknown>;
}

interface SignedUploadParams {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId?: string;
}

interface UploadedAsset {
  url: string;
  publicId: string;
}

async function uploadDirectToCloudinary(
  file: File,
  signed: SignedUploadParams,
): Promise<UploadedAsset> {
  const fd = new FormData();

  fd.append("file", file);
  fd.append("api_key", signed.apiKey);
  fd.append("timestamp", String(signed.timestamp));
  fd.append("signature", signed.signature);
  fd.append("folder", signed.folder);

  if (signed.publicId) {
    fd.append("public_id", signed.publicId);
  }

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`,
    {
      method: "POST",
      body: fd,
    },
  );

  if (!res.ok) {
    const body = await res.json().catch(() => null);

    throw new Error(
      body?.error?.message ?? "Upload ke Cloudinary gagal",
    );
  }

  const json = await res.json();

  return {
    url: json.secure_url as string,
    publicId: json.public_id as string,
  };
}

async function presignedUpload<T>(
  signPath: string,
  confirmPath: string,
  file: File,
  method: "post" | "put" = "post",
): Promise<T> {
  const signRes = await api.post<Envelope<SignedUploadParams>>(signPath);

  const asset = await uploadDirectToCloudinary(
    file,
    signRes.data.data,
  );

  const res = await api[method]<Envelope<T>>(
    confirmPath,
    asset,
  );

  return res.data.data;
}

export const uploadWithdrawalReceipt = (
  withdrawalId: string,
  file: File,
) =>
  presignedUpload<{ url: string; publicId: string }>(
    `/uploads/withdrawal/${withdrawalId}/receipt/sign`,
    `/uploads/withdrawal/${withdrawalId}/receipt`,
    file,
  );

export interface ProgramImageResult {
  id: string;
  url: string;
}

export const uploadProgramImage = (
  programId: number,
  file: File,
) =>
  presignedUpload<ProgramImageResult>(
    `/uploads/program/${programId}/image/sign`,
    `/uploads/program/${programId}/image`,
    file,
  );

export const replaceProgramImage = (
  programId: number,
  imageId: string,
  file: File,
) =>
  presignedUpload<ProgramImageResult>(
    `/uploads/program/${programId}/image/sign`,
    `/uploads/program/${programId}/image/${imageId}`,
    file,
    "put",
  );

export async function deleteProgramImage(
  programId: number,
  imageId: string,
) {
  const res = await api.delete<
    Envelope<{ deleted: boolean }>
  >(`/uploads/program/${programId}/image/${imageId}`);

  return res.data.data;
}

export const uploadUserAvatar = (file: File) =>
  presignedUpload<{ url: string; publicId: string }>(
    "/uploads/user/avatar/sign",
    "/uploads/user/avatar",
    file,
  );

export const uploadUserBanner = (file: File) =>
  presignedUpload<{ url: string; publicId: string }>(
    "/uploads/user/banner/sign",
    "/uploads/user/banner",
    file,
  );

export async function uploadMilestoneEvidence(
  milestoneId: string,
  file: File,
) {
  const fd = new FormData();
  fd.append("file", file);

  const res = await api.post<
    Envelope<{
      cid: string;
      gatewayUrl: string;
      evidenceHash: string;
    }>
  >(`/uploads/milestone/${milestoneId}/evidence`, fd);

  return res.data.data;
}