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
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute -left-28 top-10 h-80 w-80 rounded-full bg-sky-200/55 blur-3xl dark:bg-sky-900/20" />
      <div className="pointer-events-none absolute -right-28 bottom-10 h-80 w-80 rounded-full bg-violet-200/55 blur-3xl dark:bg-violet-900/20" />
      <div className="relative w-full max-w-md p-7 sm:p-8 rounded-3xl border border-white/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-2xl shadow-slate-300/35 dark:shadow-none backdrop-blur-xl space-y-7">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="p-4 bg-linear-to-br from-rose-500 to-red-700 text-white rounded-2xl shadow-lg shadow-rose-200 dark:shadow-none">
            <Activity size={30} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white">E-Triase IGD ATS</h1>
            <p className="mt-2 text-base font-medium text-slate-600 dark:text-slate-300">Masuk untuk mengakses sistem triase</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Alamat email</label>
            <input
              id="input-login-email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 text-base bg-white dark:bg-slate-950 dark:text-slate-100 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-950"
              placeholder="nama@rumahsakit.id"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Kata sandi</label>
            <input
              id="input-login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 text-base bg-white dark:bg-slate-950 dark:text-slate-100 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-950"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-sm font-semibold rounded-xl">
              <AlertCircle size={20} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            id="btn-login-submit"
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-14 flex items-center justify-center gap-2.5 px-5 py-3 bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-base font-bold rounded-xl transition cursor-pointer shadow-lg shadow-indigo-200 dark:shadow-none"
          >
            <LogIn size={21} />
            <span>{isSubmitting ? "Memproses..." : "Masuk"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
