import express from "express";
import type { Express, Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { notFoundHandler } from "./middleware/notFound";
import { errorHandler } from "./middleware/errorHandler";
import apiRouter from "./routes";
import webhookRouter from "./routes/webhook";
import { env } from "./config/env";
import { pinoHttp } from "pino-http";
import { logger } from "./lib/logger";
import * as Sentry from "@sentry/node";
import { prisma } from "./lib/prisma";
import { redis } from "./lib/redis";
import { asyncHandler } from "./utils/asyncHandler";

const app: Express = express();

if (env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
}

app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(cookieParser()); 
app.use(pinoHttp({
    logger,
    autoLogging: {
        ignore: (req) => req.url === "/health"
    },
    customLogLevel: (_req, res, err) => res.statusCode >= 500 || err ? "error" : res.statusCode >= 400 ? "warn" : "info",
}));

app.use(
    "/webhook",
    express.raw({ 
        type: "application/json",
        limit: "5mb" 
    }),
    webhookRouter
);

app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ data: "ok", error: null, meta: {} });
});

let deepCache: { at: number; ok: boolean; checks: { db: boolean; redis: boolean } } | null = null;
app.get("/health/deep", asyncHandler(async (_req: Request, res: Response) => {
    const now = Date.now();
    if (!deepCache || now - deepCache.at > 60_000) {
        const checks = { db: false, redis: false };
        try { await prisma.$queryRaw`SELECT 1`; checks.db = true; } catch {}
        try { await redis.ping(); checks.redis = true; } catch {}
        deepCache = { at: now, ok: checks.db && checks.redis, checks };
    }
    res.status(deepCache.ok ? 200 : 503).json({
        data: deepCache.ok ? "ok" : "degraded",
        error: deepCache.ok ? null : "dependency down",
        meta: deepCache.checks,
    });
}));

app.use("/api/v1", apiRouter);
app.use(notFoundHandler);
Sentry.setupExpressErrorHandler(app);
app.use(errorHandler);

export { app };