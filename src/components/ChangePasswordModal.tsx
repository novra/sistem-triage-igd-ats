import React, { useState } from "react";
import { AlertCircle, KeyRound, X } from "lucide-react";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";

interface ChangePasswordModalProps {
  blocking: boolean;
  onSuccess: () => void;
  onClose?: () => void;
}

export default function ChangePasswordModal({ blocking, onSuccess, onClose }: ChangePasswordModalProps) {
  const { refresh } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8) {
      setError("Password baru minimal 8 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password baru tidak cocok.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await apiFetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal mengganti password.");
      await refresh();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengganti password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4">
      <div className="w-full max-w-sm p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl space-y-4 relative">
        {!blocking && onClose && (
          <button
            id="btn-close-change-password"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X size={16} />
          </button>
        )}

        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-600 text-white rounded-xl">
            <KeyRound size={16} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Ganti Password</h2>
            {blocking && (
              <p className="text-[11px] text-slate-400">Password sementara harus diganti sebelum melanjutkan.</p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Password Saat Ini</label>
            <input
              id="input-current-password"
              type="password"
              required
              autoFocus
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-950 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:border-indigo-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Password Baru</label>
            <input
              id="input-new-password"
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-950 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:border-indigo-500"
              placeholder="Minimal 8 karakter"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Konfirmasi Password Baru</label>
            <input
              id="input-confirm-password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-950 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          {error && (
            <div className="flex items-start gap-1.5 px-2.5 py-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-[11px] rounded-lg">
              <AlertCircle size={13} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            id="btn-submit-change-password"
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm"
          >
            <span>{isSubmitting ? "Menyimpan..." : "Simpan Password Baru"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
