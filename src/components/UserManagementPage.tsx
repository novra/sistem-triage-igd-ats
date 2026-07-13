import React, { useEffect, useState } from "react";
import { AlertCircle, KeyRound, Plus, ShieldOff, UserPlus, Users } from "lucide-react";
import { apiFetch } from "../lib/api";
import type { UserSummary } from "../types";

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addNotice, setAddNotice] = useState("");

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch("/api/users");
      if (!res.ok) throw new Error("Gagal memuat daftar user.");
      setUsers(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat daftar user.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setAddNotice("");
    setIsSubmitting(true);
    try {
      const res = await apiFetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal menambah user.");
      setName("");
      setEmail("");
      setPassword("");
      setRole("user");
      setShowAddForm(false);
      setAddNotice(
        data.emailSent
          ? "User berhasil dibuat dan email notifikasi terkirim."
          : "User berhasil dibuat. Email notifikasi tidak terkirim (RESEND_API_KEY belum diset atau gagal) — beri tahu password awal secara manual.",
      );
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm("Nonaktifkan user ini? User tidak akan bisa login lagi.")) return;
    try {
      const res = await apiFetch(`/api/users/${id}/deactivate`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal menonaktifkan user.");
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menonaktifkan user.");
    }
  };

  const handleResetPassword = async (id: string) => {
    const newPassword = prompt("Masukkan password baru untuk user ini (minimal 8 karakter):");
    if (!newPassword) return;
    try {
      const res = await apiFetch(`/api/users/${id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal reset password.");
      alert(
        data.emailSent
          ? "Password berhasil direset dan email notifikasi terkirim ke user. User wajib ganti password saat login berikutnya."
          : "Password berhasil direset. Email notifikasi tidak terkirim (RESEND_API_KEY belum diset atau gagal) — beri tahu password baru secara manual. User wajib ganti password saat login berikutnya.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal reset password.");
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-indigo-600" />
          <div>
            <h2 className="text-md font-bold text-slate-800 dark:text-slate-100">Kelola Pengguna</h2>
            <p className="text-xs text-slate-400">Tambah, nonaktifkan, atau reset password akun pengguna</p>
          </div>
        </div>
        <button
          id="btn-toggle-add-user"
          onClick={() => setShowAddForm((v) => !v)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm"
        >
          <UserPlus size={14} />
          <span>Tambah User</span>
        </button>
      </div>

      {addNotice && (
        <div className="px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 text-[11px] rounded-lg">
          {addNotice}
        </div>
      )}
      {error && (
        <div className="flex items-start gap-1.5 px-3 py-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-[11px] rounded-lg">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleAddUser} className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Nama</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:border-indigo-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:border-indigo-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Password Awal</label>
            <input
              type="text"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 8 karakter"
              className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:border-indigo-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "user")}
              className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:border-indigo-500"
            >
              <option value="user">User Biasa</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <button
              id="btn-submit-add-user"
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm"
            >
              <Plus size={14} />
              <span>{isSubmitting ? "Menyimpan..." : "Simpan User"}</span>
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <th className="py-2 pr-3">Nama</th>
              <th className="py-2 pr-3">Email</th>
              <th className="py-2 pr-3">Role</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Login Terakhir</th>
              <th className="py-2 pr-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-4 text-center text-slate-400">
                  Memuat...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-4 text-center text-slate-400">
                  Belum ada user.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-slate-50 dark:border-slate-800/60">
                  <td className="py-2 pr-3 font-semibold text-slate-700 dark:text-slate-200">{u.name}</td>
                  <td className="py-2 pr-3 text-slate-500 dark:text-slate-400">{u.email}</td>
                  <td className="py-2 pr-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.role === "admin"
                          ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {u.role === "admin" ? "Admin" : "User"}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    {u.is_active ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Aktif</span>
                    ) : (
                      <span className="text-slate-400">Nonaktif</span>
                    )}
                    {u.must_change_password && u.is_active && (
                      <span className="ml-1 text-amber-600 dark:text-amber-400">(wajib ganti password)</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-slate-400">
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleString("id-ID") : "-"}
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleResetPassword(u.id)}
                        title="Reset Password"
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                      >
                        <KeyRound size={13} />
                      </button>
                      {u.is_active && (
                        <button
                          onClick={() => handleDeactivate(u.id)}
                          title="Nonaktifkan"
                          className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 cursor-pointer"
                        >
                          <ShieldOff size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
