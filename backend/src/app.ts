import express from "express";
import path from "path";
import pinoHttp from "pino-http";
import { randomUUID } from "crypto";
import { createServer as createViteServer } from "vite";
import { isProduction } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { logger } from "./logger";
import { monitoringRouter } from "./modules/monitoring/monitoring.routes";
import { triageRouter } from "./modules/triage/triage.routes";

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
