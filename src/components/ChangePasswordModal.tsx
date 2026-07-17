import React, { useState } from "react";
import { AlertCircle } from "lucide-react";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Dialog } from "./ui/Dialog";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";

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
    <Dialog
      open
      onOpenChange={(next) => { if (!next) onClose?.(); }}
      title="Ganti Password"
      description={blocking ? "Password sementara harus diganti sebelum melanjutkan." : undefined}
      size="sm"
      showClose={!blocking}
      dismissible={!blocking}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          id="input-current-password"
          type="password"
          label="Password Saat Ini"
          required
          autoFocus
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <Input
          id="input-new-password"
          type="password"
          label="Password Baru"
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          hint="Minimal 8 karakter"
        />
        <Input
          id="input-confirm-password"
          type="password"
          label="Konfirmasi Password Baru"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        {error && (
          <div className="flex items-start gap-1.5 rounded-lg border border-danger/30 bg-danger/5 px-2.5 py-2 text-xs text-danger">
            <AlertCircle size={13} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button id="btn-submit-change-password" type="submit" variant="primary" fullWidth disabled={isSubmitting} loading={isSubmitting}>
          {isSubmitting ? "Menyimpan..." : "Simpan Password Baru"}
        </Button>
      </form>
    </Dialog>
  );
}
