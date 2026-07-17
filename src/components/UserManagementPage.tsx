import React, { useEffect, useState } from "react";
import { AlertCircle, KeyRound, Plus, ShieldCheck, ShieldOff, Trash2, UserPlus, Users } from "lucide-react";
import { apiFetch } from "../lib/api";
import type { UserSummary } from "../types";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { Input, SelectField } from "./ui/Input";
import { Tooltip } from "./ui/Tooltip";
import { useToast } from "./ui/Toast";
import { useConfirm } from "./ui/ConfirmDialog";
import { SkeletonList } from "./ui/Skeleton";
import { EmptyState } from "./ui/EmptyState";

export default function UserManagementPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addNotice, setAddNotice] = useState("");
  const [revealedPassword, setRevealedPassword] = useState("");

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
    setRevealedPassword("");
    setIsSubmitting(true);
    try {
      const res = await apiFetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal menambah user.");
      setName("");
      setEmail("");
      setRole("user");
      setShowAddForm(false);
      if (data.emailSent) {
        setAddNotice("User berhasil dibuat. Password awal (dibuat otomatis oleh sistem) sudah dikirim ke email user.");
      } else {
        setAddNotice(
          "User berhasil dibuat, tapi email notifikasi TIDAK terkirim (RESEND_API_KEY belum diset atau gagal). Sampaikan password awal berikut ke user secara manual:",
        );
        setRevealedPassword(data.generatedPassword || "");
      }
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    const confirmed = await confirm({ title: "Nonaktifkan user ini?", description: "User tidak akan bisa login lagi sampai diaktifkan kembali.", confirmLabel: "Nonaktifkan", tone: "danger" });
    if (!confirmed) return;
    try {
      const res = await apiFetch(`/api/users/${id}/deactivate`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal menonaktifkan user.");
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menonaktifkan user.");
    }
  };

  const handleReactivate = async (id: string) => {
    const confirmed = await confirm({ title: "Aktifkan kembali user ini?", description: "User akan bisa login lagi.", confirmLabel: "Aktifkan" });
    if (!confirmed) return;
    try {
      const res = await apiFetch(`/api/users/${id}/reactivate`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal mengaktifkan user.");
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengaktifkan user.");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: `Hapus permanen akun "${name}"?`,
      description: "Tindakan ini tidak bisa dibatalkan. Riwayat aktivitasnya tetap tersimpan di log, tapi akunnya hilang total dan tidak bisa dipulihkan. Untuk user yang pernah aktif dipakai, sebaiknya nonaktifkan saja, bukan hapus.",
      confirmLabel: "Ya, hapus permanen",
      tone: "danger",
    });
    if (!confirmed) return;
    try {
      const res = await apiFetch(`/api/users/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal menghapus user.");
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus user.");
    }
  };

  const handleResetPassword = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: `Reset password "${name}"?`,
      description: "Sistem akan membuat password baru otomatis dan mengirimkannya ke email user.",
      confirmLabel: "Reset Password",
    });
    if (!confirmed) return;
    try {
      const res = await apiFetch(`/api/users/${id}/reset-password`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal reset password.");
      if (data.emailSent) {
        toast.success("Password berhasil direset dan email notifikasi terkirim ke user. User wajib ganti password saat login berikutnya.");
      } else {
        toast.warning(
          "Password berhasil direset, tapi email TIDAK terkirim (RESEND_API_KEY belum diset atau gagal). User wajib ganti password saat login berikutnya.",
          `Password baru: ${data.generatedPassword}`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal reset password.");
    }
  };

  return (
    <Card padding="lg" className="space-y-4">
      <div className="flex flex-col gap-4 border-b border-border/70 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-primary" />
          <div>
            <h2 className="text-sm font-bold text-text">Kelola Pengguna</h2>
            <p className="text-xs text-text-muted">Tambah, nonaktifkan, atau reset password akun pengguna</p>
          </div>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowAddForm((v) => !v)} leftIcon={<UserPlus size={16} />}>
          Tambah User
        </Button>
      </div>

      {addNotice && (
        <div className={`space-y-1.5 rounded-xl border p-3 text-xs ${revealedPassword ? "border-warning/30 bg-warning/10 text-amber-800 dark:text-amber-400" : "border-secondary/30 bg-secondary/10 text-secondary"}`}>
          <p>{addNotice}</p>
          {revealedPassword && (
            <code className="block select-all rounded-md border border-warning/40 bg-surface px-2 py-1.5 font-mono text-sm font-bold tracking-wider">
              {revealedPassword}
            </code>
          )}
        </div>
      )}
      {error && (
        <div className="flex items-start gap-1.5 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleAddUser} className="grid grid-cols-1 gap-3 rounded-xl border border-border/70 bg-bg p-4 sm:grid-cols-3">
          <Input label="Nama" required value={name} onChange={(e) => setName(e.target.value)} />
          <Input type="email" label="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <SelectField label="Role" value={role} onChange={(e) => setRole(e.target.value as "admin" | "user")}>
            <option value="user">User Biasa</option>
            <option value="admin">Admin</option>
          </SelectField>
          <p className="text-xs text-text-muted sm:col-span-3">
            Password awal dibuat otomatis oleh sistem dan dikirim ke email di atas — tidak perlu diisi manual.
          </p>
          <div className="sm:col-span-3">
            <Button type="submit" variant="secondary" size="sm" disabled={isSubmitting} loading={isSubmitting} leftIcon={!isSubmitting ? <Plus size={14} /> : undefined}>
              {isSubmitting ? "Menyimpan..." : "Simpan User"}
            </Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <SkeletonList rows={3} />
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title="Belum ada user" description="Tambahkan akun pertama menggunakan tombol Tambah User di atas." />
      ) : (
        <div className="space-y-2.5">
          {users.map((u) => (
            <div key={u.id} className="flex flex-col gap-3 rounded-xl border border-border/70 bg-surface p-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1.5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-text">{u.name}</span>
                    <Badge tone={u.role === "admin" ? "primary" : "neutral"}>{u.role === "admin" ? "Admin" : "User"}</Badge>
                    {u.is_active ? (
                      <Badge tone="secondary">Aktif</Badge>
                    ) : (
                      <Badge tone="neutral">Nonaktif</Badge>
                    )}
                    {u.must_change_password && u.is_active && <Badge tone="warning">Wajib ganti password</Badge>}
                  </div>
                  <p className="truncate text-xs text-text-muted">{u.email}</p>
                </div>
                <div className="text-xs text-text-muted">
                  <span className="block font-bold uppercase tracking-wider">Login Terakhir</span>
                  <span>{u.last_login_at ? new Date(u.last_login_at).toLocaleString("id-ID") : "-"}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Tooltip content="Reset Password">
                  <button onClick={() => handleResetPassword(u.id, u.name)} className="rounded-lg bg-black/5 p-2 text-text-muted transition hover:bg-black/10 dark:bg-white/8 dark:hover:bg-white/15">
                    <KeyRound size={15} />
                  </button>
                </Tooltip>
                {u.is_active ? (
                  <Tooltip content="Nonaktifkan">
                    <button onClick={() => handleDeactivate(u.id)} className="rounded-lg bg-danger/10 p-2 text-danger transition hover:bg-danger/20">
                      <ShieldOff size={15} />
                    </button>
                  </Tooltip>
                ) : (
                  <Tooltip content="Aktifkan Kembali">
                    <button onClick={() => handleReactivate(u.id)} className="rounded-lg bg-secondary/10 p-2 text-secondary transition hover:bg-secondary/20">
                      <ShieldCheck size={15} />
                    </button>
                  </Tooltip>
                )}
                <Tooltip content="Hapus Permanen">
                  <button onClick={() => handleDelete(u.id, u.name)} className="rounded-lg bg-black/5 p-2 text-text-muted transition hover:bg-danger/10 hover:text-danger dark:bg-white/8">
                    <Trash2 size={15} />
                  </button>
                </Tooltip>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
