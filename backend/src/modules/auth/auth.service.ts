import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { findUserByEmail } from "./auth.repository";
import { toAuthUser, type AuthUser } from "./auth.types";

const BCRYPT_ROUNDS = 10;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

// Hindari karakter ambigu (0/O, 1/l/I) supaya gampang dibaca/diketik ulang manual
// kalau email gagal terkirim dan admin harus menyampaikannya lisan/chat.
const TEMP_PASSWORD_CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
const TEMP_PASSWORD_LENGTH = 14;

export function generateTempPassword(): string {
  let password = "";
  for (let i = 0; i < TEMP_PASSWORD_LENGTH; i += 1) {
    password += TEMP_PASSWORD_CHARSET[randomInt(TEMP_PASSWORD_CHARSET.length)];
  }
  return password;
}

export async function verifyCredentials(email: string, password: string): Promise<AuthUser | null> {
  const row = await findUserByEmail(email);
  if (!row || !row.is_active) return null;
  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) return null;
  return toAuthUser(row);
}

export function issueToken(user: AuthUser): string {
  return jwt.sign({ sub: user.id }, env.jwtSecret, { expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"] });
}

export function verifyToken(token: string): { sub: string } | null {
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    if (typeof payload === "object" && payload && typeof payload.sub === "string") {
      return { sub: payload.sub };
    }
    return null;
  } catch {
    return null;
  }
}

// Rate limit login sederhana per email, cukup untuk deployment single-instance —
// tidak perlu Redis. Reset otomatis lewat waktu (bukan di-clear eksplisit).
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const loginFailures = new Map<string, { count: number; firstFailureAt: number }>();

export function isLoginRateLimited(email: string): boolean {
  const key = email.toLowerCase();
  const entry = loginFailures.get(key);
  if (!entry) return false;
  if (Date.now() - entry.firstFailureAt > LOGIN_WINDOW_MS) {
    loginFailures.delete(key);
    return false;
  }
  return entry.count >= MAX_LOGIN_ATTEMPTS;
}

export function recordLoginFailure(email: string): void {
  const key = email.toLowerCase();
  const entry = loginFailures.get(key);
  if (!entry || Date.now() - entry.firstFailureAt > LOGIN_WINDOW_MS) {
    loginFailures.set(key, { count: 1, firstFailureAt: Date.now() });
    return;
  }
  entry.count += 1;
}

export function resetLoginFailures(email: string): void {
  loginFailures.delete(email.toLowerCase());
}
