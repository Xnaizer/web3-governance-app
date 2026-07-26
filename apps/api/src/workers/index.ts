import * as Sentry from "@sentry/node";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import * as outbox from "../services/outboxService";
import * as webhookService from "../services/webhookService";
import { runReconciliation } from "../services/reconciliationService";
import { runRedemptionReconciliation } from "../services/redemptionService";
import { getValidatorCount } from "../services/contractService";

const IDLE_POLL_MS = 8_000;
const STALE_SWEEP_MS = 3 * 60_000;
const RECONCILE_EVERY_MS = 60 * 60 * 1000;
const RECONCILE_CHECK_MS = 60 * 60 * 1000;
const VALIDATOR_COUNT_WARM_MS = 4 * 60_000;
const RECONCILE_JOB = "reconciliation";

let running = false;
let loopPromise: Promise<void> | null = null;
let wakeSignal: (() => void) | null = null;
let staleTimer: NodeJS.Timeout | null = null;
let reconcileTimer: NodeJS.Timeout | null = null;
let validatorCountTimer: NodeJS.Timeout | null = null;

async function warmValidatorCount(): Promise<void> {
  try {
    console.time("worker:warmValidatorCount");
    await getValidatorCount();
    console.timeEnd("worker:warmValidatorCount");
  } catch (err) {
    logger.error({ err }, "[WARM] Failed to refresh onchain:validatorCount");
    Sentry.captureException(err);
  }
}

export function wake(): void {
  wakeSignal?.();
}

function waitForWork(): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      wakeSignal = null;
      resolve();
    };
    const timer = setTimeout(done, IDLE_POLL_MS);
    wakeSignal = done;
  });
}

async function processOne(): Promise<boolean> {
  const event = await outbox.claimNext();
  if (!event) return false;

  try {
    await webhookService.dispatchEvent({
      eventName: event.eventName,
      args: event.args,
      txHash: event.txHash,
    });
    await outbox.markDone(event.id);
    logger.info(
      { id: event.id, eventName: event.eventName, txHash: event.txHash },
      "[OUTBOX] Event processed",
    );
  } catch (err) {
    const { willRetry } = await outbox.markFailed(event, err);
    logger.error(
      {
        id: event.id,
        eventName: event.eventName,
        txHash: event.txHash,
        attempts: event.attempts,
        willRetry,
        err,
      },
      "[OUTBOX] Event dispatch failed",
    );

    if (!willRetry) {
      Sentry.captureException(err, {
        extra: {
          outboxId: event.id,
          eventName: event.eventName,
          txHash: event.txHash,
          logIndex: event.logIndex,
          attempts: event.attempts,
        },
      });
    }
  }

  return true;
}

async function loop(): Promise<void> {
  while (running) {
    try {
      while (running && (await processOne())) {}
    } catch (err) {
      logger.error({ err }, "[OUTBOX] Worker loop error");
      Sentry.captureException(err);
    }

    if (running) await waitForWork();
  }
}

async function reconcileIfDue(): Promise<void> {
  try {
    const last = await prisma.jobRun.findUnique({
      where: { name: RECONCILE_JOB },
    });
    const due =
      !last || Date.now() - last.lastRunAt.getTime() >= RECONCILE_EVERY_MS;
    if (!due) return;

    logger.info("[RECONCILE] Starting reconciliation cycle");
    await runReconciliation();
    await runRedemptionReconciliation();

    await prisma.jobRun.upsert({
      where: { name: RECONCILE_JOB },
      create: { name: RECONCILE_JOB, lastRunAt: new Date() },
      update: { lastRunAt: new Date() },
    });
    logger.info("[RECONCILE] Reconciliation cycle finished");
  } catch (err) {
    logger.error({ err }, "[RECONCILE] Reconciliation failed");
    Sentry.captureException(err);
  }
}

export async function startWorkers(): Promise<void> {
  if (running) return;
  running = true;

  await outbox.recoverStale();
  loopPromise = loop();

  staleTimer = setInterval(() => {
    void outbox.recoverStale().catch((err) => {
      logger.error({ err }, "[OUTBOX] Stale sweep failed");
    });
  }, STALE_SWEEP_MS);

  reconcileTimer = setInterval(() => void reconcileIfDue(), RECONCILE_CHECK_MS);
  void reconcileIfDue();

  validatorCountTimer = setInterval(() => void warmValidatorCount(), VALIDATOR_COUNT_WARM_MS);
  void warmValidatorCount();

  logger.info("[WORKER] Outbox worker started (Postgres-backed)");
}

export async function stopWorkers(): Promise<void> {
  running = false;
  wake();

  if (staleTimer) clearInterval(staleTimer);
  if (reconcileTimer) clearInterval(reconcileTimer);
  if (validatorCountTimer) clearInterval(validatorCountTimer);
  staleTimer = null;
  reconcileTimer = null;
  validatorCountTimer = null;

  await loopPromise;
  loopPromise = null;

  logger.info("[WORKER] Outbox worker stopped");
}

