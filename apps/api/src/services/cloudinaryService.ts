import { cloudinary } from "../config/cloudinary";

export interface UploadImageResult {
  url: string;
  publicId: string;
}

export interface SignedUploadParams {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId?: string;
}

export function getSignedUploadParams(opts: {
  folder: string;
  publicId?: string;
}): SignedUploadParams {
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign: Record<string, string | number> = {
    timestamp,
    folder: opts.folder,
    ...(opts.publicId ? { public_id: opts.publicId } : {}),
  };

  const apiSecret = cloudinary.config().api_secret;
  if (!apiSecret) {
    throw new Error("Cloudinary API secret is not configured");
  }

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    apiSecret,
  );

  return {
    cloudName: String(cloudinary.config().cloud_name),
    apiKey: String(cloudinary.config().api_key),
    timestamp,
    signature,
    folder: opts.folder,
    publicId: opts.publicId,
  };
}

export async function verifyUploadedAsset(
  publicId: string,
  expectedFolderPrefix: string,
): Promise<UploadImageResult> {
  if (!publicId || !publicId.startsWith(`${expectedFolderPrefix}/`)) {
    throw new Error("Asset does not belong to the expected folder");
  }

  const resource = await cloudinary.api.resource(publicId, {
    resource_type: "image",
  });

  return { url: resource.secure_url, publicId: resource.public_id };
}

export function uploadImage(
  buffer: Buffer,
  opts: { folder: string; publicId?: string },
): Promise<UploadImageResult> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: opts.folder,
        public_id: opts.publicId,
        resource_type: "image",
      },
      (err, result) => {
        if (err || !result) {
          return reject(err ?? new Error("Cloudinary upload failed"));
        }

        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(buffer);
  });
}

export async function deleteImage(publicId: string): Promise<void> {
  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
  });

  if (result.result !== "ok" && result.result !== "not found") {
    throw new Error(`Cloudinary delete failed: ${result.result}`);
  }
}