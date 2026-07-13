import { Router } from "express";
import { findUserById } from "../auth/auth.repository";
import { generateTempPassword } from "../auth/auth.service";
import { sendPasswordResetEmail, sendWelcomeEmail } from "../notifications/email.service";
import {
  DuplicateEmailError,
  createUser,
  deactivateUser,
  deleteUser,
  listUsers,
  reactivateUser,
  resetPassword,
} from "./users.repository";

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
    const { email, name, role } = req.body || {};
    if (!email || !name) {
      return res.status(400).json({ error: "Email dan nama wajib diisi." });
    }
    const userRole = role === "admin" ? "admin" : "user";
    const tempPassword = generateTempPassword();

    const user = await createUser({ email, name, password: tempPassword, role: userRole }, req.user?.id);
    const emailSent = await sendWelcomeEmail({ to: user.email, name: user.name, tempPassword });
    // Password cuma dikirim balik ke admin kalau emailnya gagal terkirim — supaya tetap
    // ada cara menyampaikan ke user, tapi tidak diekspos tanpa perlu kalau email sukses.
    return res.status(201).json({ user, emailSent, generatedPassword: emailSent ? undefined : tempPassword });
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

usersRouter.post("/:id/reactivate", async (req, res, next) => {
  try {
    const ok = await reactivateUser(req.params.id);
    if (!ok) return res.status(404).json({ error: "User tidak ditemukan." });
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

usersRouter.delete("/:id", async (req, res, next) => {
  try {
    if (req.params.id === req.user?.id) {
      return res.status(400).json({ error: "Tidak bisa menghapus akun sendiri." });
    }
    const ok = await deleteUser(req.params.id);
    if (!ok) return res.status(404).json({ error: "User tidak ditemukan." });
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

usersRouter.post("/:id/reset-password", async (req, res, next) => {
  try {
    const target = await findUserById(req.params.id);
    if (!target) return res.status(404).json({ error: "User tidak ditemukan." });

    const tempPassword = generateTempPassword();
    const ok = await resetPassword(req.params.id, tempPassword);
    if (!ok) return res.status(404).json({ error: "User tidak ditemukan." });

    const emailSent = await sendPasswordResetEmail({ to: target.email, name: target.name, tempPassword });
    return res.json({ success: true, emailSent, generatedPassword: emailSent ? undefined : tempPassword });
  } catch (error) {
    return next(error);
  }
});
