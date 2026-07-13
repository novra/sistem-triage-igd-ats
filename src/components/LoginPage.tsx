import React, { useState } from "react";
import { Activity, AlertCircle, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal login.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-sm p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-5">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="p-2.5 bg-rose-600 text-white rounded-2xl shadow-md">
            <Activity size={20} />
          </div>
          <h1 className="text-md font-bold tracking-tight text-slate-900 dark:text-slate-100">E-Triase IGD ATS</h1>
          <p className="text-[11px] text-slate-400">Masuk untuk mengakses sistem triase</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Email</label>
            <input
              id="input-login-email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-950 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:border-indigo-500"
              placeholder="nama@rumahsakit.id"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Password</label>
            <input
              id="input-login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-950 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:border-indigo-500"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="flex items-start gap-1.5 px-2.5 py-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-[11px] rounded-lg">
              <AlertCircle size={13} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            id="btn-login-submit"
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm"
          >
            <LogIn size={14} />
            <span>{isSubmitting ? "Memproses..." : "Masuk"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
