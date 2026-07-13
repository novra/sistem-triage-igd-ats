import type { PoolClient } from "pg";
import { query, withTransaction } from "../../database/client";
import { createId } from "../../shared/ids";
import { recordEvent } from "../monitoring/events.repository";

type ActingUser = { id: string; email: string; role?: string };

export class RecordAccessDeniedError extends Error {
  constructor() {
    super("Anda hanya bisa mengubah rekam triase yang Anda buat sendiri.");
  }
}

function normalizeRecord(row: any) {
  const payload = row.payload_json || {};
  const auditLogs = row.audit_logs || payload.auditLogs || [];
  return {
    ...payload,
    id: row.id,
    timestamp: row.updated_at || payload.timestamp,
    auditLogs,
    createdByUserId: row.created_by_user_id || null,
    createdByUserName: row.creator_name || null,
    createdByUserEmail: row.creator_email || null,
  };
}

const RECORD_SELECT = `
  select tr.*,
    u.name as creator_name, u.email as creator_email,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'action', al.action,
          'timestamp', al.created_at,
          'user', al.user_name
        )
        order by al.created_at
      ) filter (where al.id is not null),
      '[]'::jsonb
    ) as audit_logs
  from triage_records tr
  left join audit_logs al on al.record_id = tr.id
  left join users u on u.id = tr.created_by_user_id
`;

async function getRecordByIdWithClient(client: PoolClient, id: string) {
  const result = await client.query(
    `${RECORD_SELECT} where tr.id = $1 group by tr.id, u.name, u.email`,
    [id]
  );
  return result.rows[0] ? normalizeRecord(result.rows[0]) : null;
}

export async function listRecords(search?: string, actingUser?: ActingUser) {
  const params: any[] = [];
  const conditions: string[] = [];
  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    conditions.push(`(
      lower(tr.patient_name) like $${params.length}
      or lower(tr.patient_rm) like $${params.length}
      or lower(coalesce(tr.chief_complaint, '')) like $${params.length}
    )`);
  }
  // User biasa hanya boleh melihat rekam yang dia buat sendiri; admin melihat semua.
  if (actingUser && actingUser.role !== "admin") {
    params.push(actingUser.id);
    conditions.push(`tr.created_by_user_id = $${params.length}`);
  }
  const where = conditions.length ? `where ${conditions.join(" and ")}` : "";

  const result = await query(
    `${RECORD_SELECT} ${where} group by tr.id, u.name, u.email order by tr.updated_at desc`,
    params
  );

  return result.rows.map(normalizeRecord);
}

export async function getRecordById(id: string) {
  const result = await query(`${RECORD_SELECT} where tr.id = $1 group by tr.id, u.name, u.email`, [id]);
  return result.rows[0] ? normalizeRecord(result.rows[0]) : null;
}

function buildDbValues(record: any) {
  const finalLevel = record.atsFinal?.atsLevelFinal || record.atsFinal?.atsLevelOverride || record.atsPrediction?.atsLevel || null;
  return [
    record.nomorRM,
    record.namaPasien,
    Number(record.umur) || 0,
    record.chiefComplaint || "",
    record.atsPrediction?.atsLevel || null,
    finalLevel,
    Boolean(record.atsPrediction?.emergencyIndicator),
    JSON.stringify(record),
    record.atsFinal?.namaPetugas || "Perawat Triage IGD",
  ];
}

async function insertAudit(
  client: PoolClient,
  recordId: string,
  action: string,
  userName: string,
  detail: any = {},
  actingUser?: ActingUser,
) {
  await client.query(
    `
      insert into audit_logs (id, record_id, user_name, action, detail_json, user_id, user_email)
      values ($1, $2, $3, $4, $5::jsonb, $6, $7)
    `,
    [createId("AUD"), recordId, userName || "Perawat Triage IGD", action, JSON.stringify(detail), actingUser?.id || null, actingUser?.email || null]
  );
}

export async function saveRecord(input: any, actingUser?: ActingUser) {
  const timestamp = new Date().toISOString();
  return withTransaction(async (client) => {
    const id = input.id || createId("TRG");
    const existing = input.id
      ? await client.query("select id, created_by_user_id from triage_records where id = $1", [input.id])
      : { rowCount: 0, rows: [] as any[] };

    // User biasa cuma boleh menimpa (edit) rekam yang dia buat sendiri. Baris tanpa
    // created_by_user_id (rekam lama/legacy) dianggap bukan miliknya juga — lebih aman
    // daripada mengizinkan edit ke rekam yang kepemilikannya tidak jelas.
    if (existing.rowCount && actingUser && actingUser.role !== "admin") {
      const ownerId = existing.rows[0].created_by_user_id;
      if (ownerId !== actingUser.id) {
        throw new RecordAccessDeniedError();
      }
    }

    const action = existing.rowCount ? "Update Data Triase" : "Pendaftaran & Triase Baru";
    const record = {
      ...input,
      id,
      timestamp,
    };
    const values = buildDbValues(record);

    await client.query(
      `
        insert into triage_records (
          id, patient_rm, patient_name, patient_age, chief_complaint,
          ats_predicted, ats_final, emergency_indicator, payload_json, created_by,
          created_by_user_id, created_at, updated_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, now(), now())
        on conflict (id) do update set
          patient_rm = excluded.patient_rm,
          patient_name = excluded.patient_name,
          patient_age = excluded.patient_age,
          chief_complaint = excluded.chief_complaint,
          ats_predicted = excluded.ats_predicted,
          ats_final = excluded.ats_final,
          emergency_indicator = excluded.emergency_indicator,
          payload_json = excluded.payload_json,
          updated_at = now()
      `,
      // created_by_user_id sengaja TIDAK ada di klausa "do update set" di atas, supaya
      // pemilik asli tetap tercatat walau record-nya diedit ulang (termasuk oleh admin).
      [id, ...values, actingUser?.id || null]
    );

    await insertAudit(client, id, action, record.atsFinal?.namaPetugas, { atsFinal: record.atsFinal || null }, actingUser);
    const saved = await getRecordByIdWithClient(client, id);
    return saved || record;
  });
}

export async function deleteRecord(id: string, actingUser?: ActingUser) {
  const existing = await query("select patient_rm, patient_name from triage_records where id = $1", [id]);
  if (!existing.rowCount) return false;

  // audit_logs ikut cascade-delete bersama record, jadi jejak "siapa yang menghapus"
  // harus ditulis ke system_events SEBELUM delete, bukan ke audit_logs.
  recordEvent({
    eventType: "triage_record_deleted",
    level: "warn",
    userId: actingUser?.id,
    userEmail: actingUser?.email,
    detail: { recordId: id, patientRm: existing.rows[0].patient_rm, patientName: existing.rows[0].patient_name },
  });

  const result = await query("delete from triage_records where id = $1 returning id", [id]);
  return Boolean(result.rowCount);
}
