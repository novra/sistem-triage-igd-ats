export type UserRole = "admin" | "user";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
};

export type UserRow = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: UserRole;
  is_active: boolean;
  must_change_password: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
};

export function toAuthUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    isActive: row.is_active,
    mustChangePassword: row.must_change_password,
  };
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
