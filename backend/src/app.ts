import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { isProduction } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { triageRouter } from "./modules/triage/triage.routes";

export async function createApp() {
  const app = express();

  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", database: "postgresql", timestamp: new Date().toISOString() });
  });

  app.use("/api/triage", triageRouter);

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
