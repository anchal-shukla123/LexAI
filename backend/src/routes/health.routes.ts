import { Router } from "express";

import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";

export const healthRouter = Router();
export const readinessRouter = Router();

const startedAt = new Date();

healthRouter.get("/", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "lexai-api",
    environment: env.NODE_ENV,
    uptimeSeconds: Math.round(process.uptime()),
    startedAt: startedAt.toISOString(),
    timestamp: new Date().toISOString()
  });
});

readinessRouter.get("/", async (_req, res) => {
  const started = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - started;

    res.status(200).json({
      status: "ready",
      service: "lexai-api",
      db: {
        status: "ok",
        latencyMs
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const latencyMs = Date.now() - started;
    const message = error instanceof Error ? error.message : "Database unavailable.";

    res.status(503).json({
      status: "not_ready",
      service: "lexai-api",
      db: {
        status: "unavailable",
        latencyMs,
        message
      },
      timestamp: new Date().toISOString()
    });
  }
});
