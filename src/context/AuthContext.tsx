import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { AuthUser } from "../types";
import { apiFetch, setUnauthorizedHandler } from "../lib/api";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const refresh = useCallback(async () => {
    try {
      const res = await apiFetch("/api/auth/me");
      if (!res.ok) {
        setUser(null);
        setStatus("unauthenticated");
        return;
      }
      const data = await res.json();
      setUser(data.user);
      setStatus("authenticated");
    } catch {
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setStatus("unauthenticated");
    });
    refresh();
    return () => setUnauthorizedHandler(null);
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "same-origin",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Gagal login.");
    }
    setUser(data.user);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  return <AuthContext.Provider value={{ user, status, login, logout, refresh }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return ctx;
}
