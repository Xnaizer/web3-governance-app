import express, { type Router } from "express";
import { randomUUID } from "node:crypto";
import { webhookVerify } from "../middleware/webhookVerify";
import { asyncHandler } from "../utils/asyncHandler";
import response from "../utils/response";
import { isKnownEvent } from "../services/webhookService";
import * as outboxService from "../services/outboxService";
import type { PendingEvent } from "../services/outboxService";
import { wake } from "../workers";
import {
  decodeGovernanceLog,
  extractLogs,
  jsonSafe,
} from "../services/webhookDecoder";

const router: Router = express.Router();

router.post(
  "/alchemy",
  webhookVerify,
  asyncHandler(async (req, res) => {
    const payload = JSON.parse(req.body.toString("utf8"));
    const events: PendingEvent[] = [];

    if (payload.eventName) {
      if (isKnownEvent(payload.eventName)) {
        events.push({
          eventName: payload.eventName,
          args: jsonSafe(payload.args ?? {}),
          txHash: payload.txHash ?? `mock:${randomUUID()}`,
          logIndex: 0,
        });
      }
    } else {
      for (const log of extractLogs(payload)) {
        const decoded = decodeGovernanceLog(log);

        if (!decoded || !isKnownEvent(decoded.eventName)) continue;

        events.push({
          eventName: decoded.eventName,
          args: decoded.args,
          txHash: decoded.txHash,
          logIndex: decoded.logIndex,
        });
      }
    }

    const queued = await outboxService.enqueue(events);
    if (queued > 0) wake();

    response.success(res, { queued });
  }),
);

export default router;