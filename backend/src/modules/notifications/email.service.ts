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

// Best-effort: kegagalan kirim email TIDAK BOLEH menggagalkan pembuatan/reset user.
// Kalau RESEND_API_KEY belum diset, cukup diam-diam dilewati (admin sudah tahu
// password awal/baru karena dia sendiri yang mengetiknya).
async function sendCredentialEmail(input: {
  to: string;
  subject: string;
  bodyHtml: string;
  context: string;
}): Promise<boolean> {
  const client = getClient();
  if (!client) {
    logger.warn({ to: input.to, context: input.context }, "RESEND_API_KEY tidak diset, email dilewati");
    return false;
  }

  try {
    await client.emails.send({ from: env.emailFrom, to: input.to, subject: input.subject, html: input.bodyHtml });
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
    subject: "Akun Sistem Triage IGD ATS Anda",
    bodyHtml: `
      <p>Halo ${input.name},</p>
      <p>Akun Anda telah dibuat di Sistem Triage IGD ATS.</p>
      <p><b>Email:</b> ${input.to}<br/><b>Password sementara:</b> ${input.tempPassword}</p>
      <p>Anda akan diminta mengganti password ini saat pertama kali login.</p>
      <p><a href="${env.appUrl}">${env.appUrl}</a></p>
    `,
  });
}

export function sendPasswordResetEmail(input: { to: string; name: string; tempPassword: string }): Promise<boolean> {
  return sendCredentialEmail({
    to: input.to,
    context: "password-reset-email",
    subject: "Password Akun Sistem Triage IGD ATS Anda Direset",
    bodyHtml: `
      <p>Halo ${input.name},</p>
      <p>Password akun Anda di Sistem Triage IGD ATS baru saja direset oleh admin.</p>
      <p><b>Password sementara:</b> ${input.tempPassword}</p>
      <p>Anda akan diminta mengganti password ini saat login berikutnya.</p>
      <p>Kalau Anda tidak meminta reset ini, segera hubungi admin sistem.</p>
      <p><a href="${env.appUrl}">${env.appUrl}</a></p>
    `,
  });
}
