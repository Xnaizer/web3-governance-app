import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../services/jwtService";
import { redis } from "../lib/redis";
import { AppError } from "../utils/AppError";

export async function authMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> {
    const cookieToken = req.cookies?.token as string | undefined;
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : undefined;

    const token = cookieToken ?? bearerToken;

    if (!token) {
        throw new AppError("Authentication required", 401);
    }

    let payload;

    try {
        payload = verifyToken(token);
    } catch {
        throw new AppError("Invalid or expired token", 401);
    }

    console.time("auth:redis-mget");
    const [isBlocked, validAfter] = await redis.mget(
        `blocklist:${payload.jti}`,
        `tokensValidAfter:${payload.sub}`,
    );
    console.timeEnd("auth:redis-mget");

    if(isBlocked) {
        throw new AppError("Token has been revoked", 401);
    }

    if(validAfter) {
        const tokenIssuesAt = payload.iat;
        if(tokenIssuesAt && tokenIssuesAt < Number(validAfter)) {
            throw new AppError("Token has been revoked, please log in again", 401)
        }
    }

    req.user = {
        id: payload.sub,
        role: payload.role,
        jti: payload.jti
    };

    next();
}