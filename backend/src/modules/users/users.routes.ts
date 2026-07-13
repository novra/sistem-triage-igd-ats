import { Router } from "express";
import { findUserById } from "../auth/auth.repository";
import { sendPasswordResetEmail, sendWelcomeEmail } from "../notifications/email.service";
import { DuplicateEmailError, createUser, deactivateUser, listUsers, resetPassword } from "./users.repository";

export const usersRouter = Router();

usersRouter.get("/", async (_req, res, next) => {
  try {
    return res.json(await listUsers());
  } catch (error) {
    return next(error);
  }
});

usersRouter.post("/", async (req, res, next) => {
  try {
    const { email, name, password, role } = req.body || {};
    if (!email || !name || !password) {
      return res.status(400).json({ error: "Email, nama, dan password awal wajib diisi." });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: "Password awal minimal 8 karakter." });
    }
    const userRole = role === "admin" ? "admin" : "user";

    const user = await createUser({ email, name, password, role: userRole }, req.user?.id);
    const emailSent = await sendWelcomeEmail({ to: user.email, name: user.name, tempPassword: password });
    return res.status(201).json({ user, emailSent });
  } catch (error) {
    if (error instanceof DuplicateEmailError) {
      return res.status(409).json({ error: error.message });
    }
    return next(error);
  }
});

usersRouter.post("/:id/deactivate", async (req, res, next) => {
  try {
    if (req.params.id === req.user?.id) {
      return res.status(400).json({ error: "Tidak bisa menonaktifkan akun sendiri." });
    }
    const ok = await deactivateUser(req.params.id);
    if (!ok) return res.status(404).json({ error: "User tidak ditemukan." });
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

usersRouter.post("/:id/reset-password", async (req, res, next) => {
  try {
    const { newPassword } = req.body || {};
    if (!newPassword || String(newPassword).length < 8) {
      return res.status(400).json({ error: "Password baru minimal 8 karakter." });
    }
    const target = await findUserById(req.params.id);
    if (!target) return res.status(404).json({ error: "User tidak ditemukan." });

    const ok = await resetPassword(req.params.id, newPassword);
    if (!ok) return res.status(404).json({ error: "User tidak ditemukan." });

    const emailSent = await sendPasswordResetEmail({ to: target.email, name: target.name, tempPassword: newPassword });
    return res.json({ success: true, emailSent });
  } catch (error) {
    return next(error);
  }
});
