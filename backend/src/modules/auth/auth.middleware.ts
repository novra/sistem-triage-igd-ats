import type { NextFunction, Request, Response } from "express";
import { findUserById } from "./auth.repository";
import { verifyToken } from "./auth.service";
import { toAuthUser } from "./auth.types";

export const AUTH_COOKIE_NAME = "ats_session";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[AUTH_COOKIE_NAME];
    const payload = token ? verifyToken(token) : null;
    if (!payload) {
      return res.status(401).json({ error: "Sesi tidak valid, silakan login kembali.", code: "UNAUTHENTICATED" });
    }
    const row = await findUserById(payload.sub);
    if (!row || !row.is_active) {
      return res.status(401).json({ error: "Akun tidak ditemukan atau sudah dinonaktifkan.", code: "UNAUTHENTICATED" });
    }
    req.user = toAuthUser(row);
    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Aksi ini hanya untuk admin.", code: "FORBIDDEN" });
  }
  return next();
}

// Dipasang di route selain /api/auth supaya user yang wajib ganti password tidak bisa
// pakai fitur lain sebelum menyelesaikan itu, walau frontend-nya di-skip/dimanipulasi.
export function blockIfMustChangePassword(req: Request, res: Response, next: NextFunction) {
  if (req.user?.mustChangePassword) {
    return res.status(403).json({ error: "Silakan ganti password terlebih dahulu.", code: "MUST_CHANGE_PASSWORD" });
  }
  return next();
}
