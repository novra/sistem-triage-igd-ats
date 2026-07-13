import express from "express";
import path from "path";
import pinoHttp from "pino-http";
import { randomUUID } from "crypto";
import { createServer as createViteServer } from "vite";
import { isProduction } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { logger } from "./logger";
import { recordEvent } from "./modules/monitoring/events.repository";
import { monitoringRouter } from "./modules/monitoring/monitoring.routes";
import { triageRouter } from "./modules/triage/triage.routes";

const SLOW_REQUEST_THRESHOLD_MS = 1000;

export async function createApp() {
  const app = express();

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const existing = req.headers["x-request-id"];
        const id = (Array.isArray(existing) ? existing[0] : existing) || randomUUID();
        res.setHeader("x-request-id", id);
        return id;
      },
      // Body pasien tidak boleh masuk log akses HTTP — hanya path/method/status/durasi.
      serializers: {
        req: (req) => ({ id: req.id, method: req.method, url: req.url }),
      },
    }),
  );

  // Rekam ke system_events hanya request /api yang lambat atau gagal — supaya tabel
  // tidak kebanjiran baris untuk tiap request cepat/sukses dan menggeser event bisnis
  // (klasifikasi ATS, kegagalan AI) keluar dari jendela laporan.
  app.use((req, res, next) => {
    if (!req.path.startsWith("/api/")) return next();
    const startedAt = Date.now();
    res.on("finish", () => {
      const durationMs = Date.now() - startedAt;
      const isSlow = durationMs > SLOW_REQUEST_THRESHOLD_MS;
      const isError = res.statusCode >= 400;
      if (!isSlow && !isError) return;
      recordEvent({
        eventType: "http_request",
        level: res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info",
        durationMs,
        message: `${req.method} ${req.path}`,
        detail: { statusCode: res.statusCode, slow: isSlow },
      });
    });
    next();
  });

  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", database: "postgresql", timestamp: new Date().toISOString() });
  });

  app.use("/api/triage", triageRouter);
  app.use("/api/monitoring", monitoringRouter);

  if (isProduction) {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.use(errorHandler);

  return app;
}
