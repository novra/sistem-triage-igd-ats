import { query } from "../../database/client";
import { createId } from "../../shared/ids";
import { logger } from "../../logger";

export type SystemEventInput = {
  eventType: string;
  level?: "info" | "warn" | "error";
  provider?: string;
  model?: string;
  atsLevel?: number | null;
  durationMs?: number;
  message?: string;
  detail?: Record<string, unknown>;
  userId?: string;
  userEmail?: string;
};

// Fire-and-forget: kegagalan menulis event monitoring tidak boleh menggagalkan
// request pengguna yang sedang berjalan (mis. proses triase pasien).
export function recordEvent(input: SystemEventInput) {
  query(
    `insert into system_events (id, event_type, level, provider, model, ats_level, duration_ms, message, detail_json, user_id, user_email)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11)`,
    [
      createId("EVT"),
      input.eventType,
      input.level || "info",
      input.provider || null,
      input.model || null,
      input.atsLevel ?? null,
      input.durationMs ?? null,
      input.message || null,
      JSON.stringify(input.detail || {}),
      input.userId || null,
      input.userEmail || null,
    ],
  ).catch((error) => {
    logger.error({ err: error, eventType: input.eventType }, "Failed to persist system event");
  });
}

export async function listEvents(from?: string, to?: string) {
  const params: any[] = [];
  const conditions: string[] = [];
  if (from) {
    params.push(from);
    conditions.push(`created_at >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    conditions.push(`created_at <= $${params.length}`);
  }
  const where = conditions.length ? `where ${conditions.join(" and ")}` : "";
  const result = await query(
    `select * from system_events ${where} order by created_at desc limit 5000`,
    params,
  );
  return result.rows;
}
