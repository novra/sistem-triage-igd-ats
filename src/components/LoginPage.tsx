import React, { useState } from "react";
import { Activity, AlertCircle, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Card } from "./ui/Card";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-4 py-10">
      <div className="pointer-events-none absolute -left-28 top-10 size-80 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 bottom-10 size-80 rounded-full bg-accent/15 blur-3xl" />
      <Card padding="lg" glass className="relative w-full max-w-md space-y-7 shadow-2xl">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="rounded-2xl bg-linear-to-br from-primary to-accent p-4 text-white shadow-lg shadow-primary/25">
            <Activity size={30} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-text">E-Triase IGD ATS</h1>
            <p className="mt-2 text-base font-medium text-text-muted">Masuk untuk mengakses sistem triase</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="input-login-email"
            type="email"
            label="Alamat email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            id="input-login-password"
            type="password"
            label="Kata sandi"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm font-semibold text-danger">
              <AlertCircle size={20} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            id="btn-login-submit"
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={isSubmitting}
            loading={isSubmitting}
            leftIcon={!isSubmitting ? <LogIn size={20} /> : undefined}
          >
            {isSubmitting ? "Memproses..." : "Masuk"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
