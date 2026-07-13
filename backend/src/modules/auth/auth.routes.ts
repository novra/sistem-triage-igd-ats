import { Router } from "express";
import { isProduction } from "../../config/env";
import { recordEvent } from "../monitoring/events.repository";
import { findUserById, touchLastLogin, updatePassword } from "./auth.repository";
import { AUTH_COOKIE_NAME, requireAuth } from "./auth.middleware";
import {
  hashPassword,
  isLoginRateLimited,
  issueToken,
  recordLoginFailure,
  resetLoginFailures,
  verifyCredentials,
  verifyToken,
} from "./auth.service";
import bcrypt from "bcryptjs";

export const authRouter = Router();

const AUTH_COOKIE_MAX_AGE_MS = 10 * 60 * 60 * 1000;

function setAuthCookie(res: import("express").Response, token: string) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
  });
}

authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email dan password wajib diisi." });
    }
    if (isLoginRateLimited(email)) {
      return res.status(429).json({ error: "Terlalu banyak percobaan login gagal. Coba lagi dalam beberapa menit." });
    }

    const user = await verifyCredentials(email, password);
    if (!user) {
      recordLoginFailure(email);
      recordEvent({ eventType: "login_failed", level: "warn", message: "Login gagal", detail: { email } });
      return res.status(401).json({ error: "Email atau password salah." });
    }

    resetLoginFailures(email);
    await touchLastLogin(user.id);
    const token = issueToken(user);
    setAuthCookie(res, token);
    recordEvent({ eventType: "login_success", userId: user.id, userEmail: user.email });
    return res.json({ user });
  } catch (error) {
    return next(error);
  }
});

// Sengaja tidak pakai requireAuth di sini: logout harus tetap berhasil membersihkan
// cookie walau token sudah kedaluwarsa/tidak valid. Identitas user diambil manual
// best-effort, hanya untuk keperluan pencatatan log.
authRouter.post("/logout", async (req, res) => {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  const payload = token ? verifyToken(token) : null;
  if (payload) {
    const row = await findUserById(payload.sub).catch(() => null);
    if (row) {
      recordEvent({ eventType: "logout", userId: row.id, userEmail: row.email });
    }
  }
  res.clearCookie(AUTH_COOKIE_NAME);
  return res.json({ success: true });
});

authRouter.get("/me", requireAuth, (req, res) => {
  return res.json({ user: req.user });
});

authRouter.post("/change-password", requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Password saat ini dan password baru wajib diisi." });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ error: "Password baru minimal 8 karakter." });
    }

    const row = await findUserById(req.user!.id);
    if (!row) return res.status(401).json({ error: "Sesi tidak valid." });

    const valid = await bcrypt.compare(currentPassword, row.password_hash);
    if (!valid) return res.status(400).json({ error: "Password saat ini salah." });

    const passwordHash = await hashPassword(newPassword);
    await updatePassword(row.id, passwordHash, false);
    recordEvent({ eventType: "password_changed", userId: row.id, userEmail: row.email });
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});
