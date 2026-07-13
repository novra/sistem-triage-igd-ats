import type { NextFunction, Request, Response } from "express";
import { recordEvent } from "../modules/monitoring/events.repository";

export function errorHandler(error: any, req: Request, res: Response, _next: NextFunction) {
  req.log?.error({ err: error }, "Unhandled request error");
  recordEvent({
    eventType: "http_error",
    level: "error",
    message: error?.message || "Terjadi kesalahan pada server",
    detail: { path: req.originalUrl, method: req.method, statusCode: error?.statusCode || 500 },
  });
  res.status(error?.statusCode || 500).json({
    error: error?.message || "Terjadi kesalahan pada server",
  });
}
