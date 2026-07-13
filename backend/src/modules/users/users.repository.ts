import { query } from "../../database/client";
import { env } from "../../config/env";
import { logger } from "../../logger";
import { createId } from "../../shared/ids";
import { hashPassword } from "../auth/auth.service";
import type { UserRole } from "../auth/auth.types";

export type UserSummary = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  last_login_at: string | null;
};

const SUMMARY_COLUMNS = "id, email, name, role, is_active, must_change_password, created_at, last_login_at";

export async function listUsers(): Promise<UserSummary[]> {
  const result = await query<UserSummary>(`select ${SUMMARY_COLUMNS} from users order by created_at desc`);
  return result.rows;
}

export class DuplicateEmailError extends Error {
  constructor() {
    super("Email sudah terdaftar.");
  }
}

export async function createUser(
  input: { email: string; name: string; password: string; role: UserRole },
  createdByUserId?: string,
): Promise<UserSummary> {
  const passwordHash = await hashPassword(input.password);
  try {
    const result = await query<UserSummary>(
      `insert into users (id, email, name, password_hash, role, must_change_password, created_by)
       values ($1, $2, $3, $4, $5, true, $6)
       returning ${SUMMARY_COLUMNS}`,
      [createId("USR"), input.email.toLowerCase().trim(), input.name.trim(), passwordHash, input.role, createdByUserId || null],
    );
    return result.rows[0];
  } catch (error: any) {
    if (error?.code === "23505") throw new DuplicateEmailError();
    throw error;
  }
}

export async function deactivateUser(id: string): Promise<boolean> {
  const result = await query("update users set is_active = false, updated_at = now() where id = $1", [id]);
  return Boolean(result.rowCount);
}

export async function resetPassword(id: string, newPassword: string): Promise<boolean> {
  const passwordHash = await hashPassword(newPassword);
  const result = await query(
    "update users set password_hash = $2, must_change_password = true, updated_at = now() where id = $1",
    [id, passwordHash],
  );
  return Boolean(result.rowCount);
}

// Dipanggil sekali saat startup: kalau tabel users masih kosong, buat satu akun admin
// dari env var supaya ada jalan masuk pertama (tidak ada fitur signup publik).
export async function ensureAdminBootstrap(): Promise<void> {
  const { rows } = await query<{ count: number }>("select count(*)::int as count from users");
  if (rows[0].count > 0) return;

  if (!env.adminEmail || !env.adminPassword) {
    logger.warn(
      "Tabel users kosong dan ADMIN_EMAIL/ADMIN_PASSWORD belum diset — tidak ada akun admin dibuat. " +
        "Set env var tersebut lalu restart server untuk membuat akun admin pertama.",
    );
    return;
  }

  await createUser({ email: env.adminEmail, name: env.adminName, password: env.adminPassword, role: "admin" });
  logger.info({ email: env.adminEmail }, "Akun admin pertama dibuat dari env var bootstrap");
}
