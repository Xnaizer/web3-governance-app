import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const redisUrl = z
  .string()
  .min(1, "UPSTASH_REDIS_URL is required")
  .refine(
    (val) => {
      try {
        const u = new URL(val);
        return u.protocol === "redis:" || u.protocol === "rediss:";
      } catch {
        return false;
      }
    },
    {
      message:
        "UPSTASH_REDIS_URL must be a valid redis:// or rediss:// URL " +
        "(paste ONLY the connection string, not the `redis-cli --tls -u ...` command)",
    },
  );

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().min(1, "DIRECT_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 chars"),
  JWT_EXPIRES_IN: z.string().default("1d"),
  UPSTASH_REDIS_URL: redisUrl,
  BREVO_API_KEY: z.string().min(1, "BREVO_API_KEY is required"),
  EMAIL_FROM: z.string().default("GovernanceFund <noreply@governancefund.dev>"),
  FRONTEND_URL: z.string().min(1, "http://localhost:3000"),
  ALCHEMY_BASE_SEPOLIA_RPC_URL: z.string().url("Invalid Alchemy RPC URL"),
  ALCHEMY_WEBHOOK_SECRET: z
    .string()
    .min(1, "ALCHEMY_WEBHOOK_SECRET is required"),
  TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
  ENABLE_WORKERS: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
  SENTRY_DSN: z.string().url().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().min(1, "CLOUDINARY_CLOUD_NAME is required"),
  CLOUDINARY_API_KEY: z.string().min(1, "CLOUDINARY_API_KEY is required"),
  CLOUDINARY_API_SECRET: z.string().min(1, "CLOUDINARY_API_SECRET is required"),
  PINATA_JWT: z.string().min(1, "PINATA_JWT is required"),
  PINATA_GATEWAY: z.string().min(1, "PINATA_GATEWAY is required"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
