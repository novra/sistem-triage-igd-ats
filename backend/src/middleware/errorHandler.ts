import type { NextFunction, Request, Response } from "express";

export function errorHandler(error: any, _req: Request, res: Response, _next: NextFunction) {
  console.error(error);
  res.status(error?.statusCode || 500).json({
    error: error?.message || "Terjadi kesalahan pada server",
  });
}
