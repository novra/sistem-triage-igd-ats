import { query } from "../../database/client";
import type { UserRow } from "./auth.types";

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const result = await query<UserRow>("select * from users where lower(email) = lower($1)", [email]);
  return result.rows[0] || null;
}

export async function findUserById(id: string): Promise<UserRow | null> {
  const result = await query<UserRow>("select * from users where id = $1", [id]);
  return result.rows[0] || null;
}

export async function touchLastLogin(id: string): Promise<void> {
  await query("update users set last_login_at = now() where id = $1", [id]);
}

export async function updatePassword(id: string, passwordHash: string, mustChangePassword: boolean): Promise<void> {
  await query(
    "update users set password_hash = $2, must_change_password = $3, updated_at = now() where id = $1",
    [id, passwordHash, mustChangePassword],
  );
}
