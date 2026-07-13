import { Resend } from "resend";
import { env } from "../../config/env";
import { logger } from "../../logger";
import { recordEvent } from "../monitoring/events.repository";

let resendClient: Resend | null = null;
function getClient(): Resend | null {
  if (!env.resendApiKey) return null;
  if (!resendClient) resendClient = new Resend(env.resendApiKey);
  return resendClient;
}

// Bungkus fragment HTML jadi dokumen penuh yang wajar (bukan cuma potongan <p> lepas) —
// filter spam menilai email yang strukturnya tidak lengkap/aneh lebih curiga.
function wrapHtml(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="id">
  <head><meta charset="utf-8" /></head>
  <body style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #1f2937; line-height: 1.6;">
    ${bodyHtml}
  </body>
</html>`;
}

// Best-effort: kegagalan kirim email TIDAK BOLEH menggagalkan pembuatan/reset user.
// Kalau RESEND_API_KEY belum diset, cukup diam-diam dilewati (admin sudah tahu
// password awal/baru karena dia sendiri yang mengetiknya).
async function sendCredentialEmail(input: {
  to: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  context: string;
}): Promise<boolean> {
  const client = getClient();
  if (!client) {
    logger.warn({ to: input.to, context: input.context }, "RESEND_API_KEY tidak diset, email dilewati");
    return false;
  }

  try {
    // resend.emails.send() TIDAK melempar exception untuk error level-API (mis. domain
    // pengirim belum diverifikasi, atau di mode sandbox cuma boleh kirim ke email pemilik
    // akun Resend) — errornya dikembalikan lewat field `error`, bukan throw. Kalau ini
    // tidak dicek eksplisit, kegagalan kirim akan salah dilaporkan sebagai sukses.
    const { data, error } = await client.emails.send({
      from: env.emailFrom,
      to: input.to,
      subject: input.subject,
      html: wrapHtml(input.bodyHtml),
      // Versi teks polos di samping HTML — email multipart (html+text) jauh lebih jarang
      // ditandai spam dibanding yang cuma HTML, karena spam murni HTML lebih umum dipakai
      // untuk menyembunyikan konten dari filter.
      text: input.bodyText,
    });
    if (error) {
      logger.error({ err: error, to: input.to, context: input.context }, "Resend menolak pengiriman email");
      recordEvent({
        eventType: "email_failure",
        level: "warn",
        message: error.message || String(error),
        detail: { context: input.context, to: input.to, resendError: error },
      });
      return false;
    }
    logger.info({ to: input.to, context: input.context, id: data?.id }, "Email terkirim via Resend");
    return true;
  } catch (error) {
    logger.error({ err: error, to: input.to, context: input.context }, "Gagal mengirim email");
    recordEvent({
      eventType: "email_failure",
      level: "warn",
      message: error instanceof Error ? error.message : String(error),
      detail: { context: input.context, to: input.to },
    });
    return false;
  }
}

export function sendWelcomeEmail(input: { to: string; name: string; tempPassword: string }): Promise<boolean> {
  return sendCredentialEmail({
    to: input.to,
    context: "welcome-email",
    subject: "Akun Sistem Triage IGD ATS Anda sudah aktif",
    bodyHtml: `
      <p>Halo ${input.name},</p>
      <p>Akun Anda telah dibuat di Sistem Triage IGD ATS.</p>
      <p>Email: ${input.to}<br/>Password sementara: <b>${input.tempPassword}</b></p>
      <p>Anda akan diminta mengganti password ini saat login pertama kali.</p>
      <p><a href="${env.appUrl}">${env.appUrl}</a></p>
    `,
    bodyText: [
      `Halo ${input.name},`,
      "",
      "Akun Anda telah dibuat di Sistem Triage IGD ATS.",
      `Email: ${input.to}`,
      `Password sementara: ${input.tempPassword}`,
      "",
      "Anda akan diminta mengganti password ini saat login pertama kali.",
      "",
      env.appUrl,
    ].join("\n"),
  });
}

export function sendPasswordResetEmail(input: { to: string; name: string; tempPassword: string }): Promise<boolean> {
  return sendCredentialEmail({
    to: input.to,
    context: "password-reset-email",
    subject: "Password akun Sistem Triage IGD ATS Anda diperbarui",
    bodyHtml: `
      <p>Halo ${input.name},</p>
      <p>Password akun Anda di Sistem Triage IGD ATS baru saja diperbarui oleh admin.</p>
      <p>Password sementara: <b>${input.tempPassword}</b></p>
      <p>Anda akan diminta mengganti password ini saat login berikutnya.</p>
      <p>Kalau Anda tidak meminta perubahan ini, hubungi admin sistem.</p>
      <p><a href="${env.appUrl}">${env.appUrl}</a></p>
    `,
    bodyText: [
      `Halo ${input.name},`,
      "",
      "Password akun Anda di Sistem Triage IGD ATS baru saja diperbarui oleh admin.",
      `Password sementara: ${input.tempPassword}`,
      "",
      "Anda akan diminta mengganti password ini saat login berikutnya.",
      "Kalau Anda tidak meminta perubahan ini, hubungi admin sistem.",
      "",
      env.appUrl,
    ].join("\n"),
  });
}
