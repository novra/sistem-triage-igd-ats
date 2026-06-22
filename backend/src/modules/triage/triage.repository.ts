import type { PoolClient } from "pg";
import { query, withTransaction } from "../../database/client";
import { createId } from "../../shared/ids";

function normalizeRecord(row: any) {
  const payload = row.payload_json || {};
  const auditLogs = row.audit_logs || payload.auditLogs || [];
  return {
    ...payload,
    id: row.id,
    timestamp: row.updated_at || payload.timestamp,
    auditLogs,
  };
}

async function getRecordByIdWithClient(client: PoolClient, id: string) {
  const result = await client.query(
    `
      select tr.*,
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
      where tr.id = $1
      group by tr.id
    `,
    [id]
  );
  return result.rows[0] ? normalizeRecord(result.rows[0]) : null;
}

export async function listRecords(search?: string) {
  const params: any[] = [];
  let where = "";
  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    where = `
      where lower(patient_name) like $1
         or lower(patient_rm) like $1
         or lower(coalesce(chief_complaint, '')) like $1
    `;
  }

  const result = await query(
    `
      select tr.*,
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
      ${where}
      group by tr.id
      order by tr.updated_at desc
    `,
    params
  );

  return result.rows.map(normalizeRecord);
}

export async function getRecordById(id: string) {
  const result = await query(
    `
      select tr.*,
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
      where tr.id = $1
      group by tr.id
    `,
    [id]
  );
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

async function insertAudit(client: PoolClient, recordId: string, action: string, userName: string, detail: any = {}) {
  await client.query(
    `
      insert into audit_logs (id, record_id, user_name, action, detail_json)
      values ($1, $2, $3, $4, $5::jsonb)
    `,
    [createId("AUD"), recordId, userName || "Perawat Triage IGD", action, JSON.stringify(detail)]
  );
}

export async function saveRecord(input: any) {
  const timestamp = new Date().toISOString();
  return withTransaction(async (client) => {
    const id = input.id || createId("TRG");
    const existing = input.id
      ? await client.query("select id from triage_records where id = $1", [input.id])
      : { rowCount: 0 };
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
          created_at, updated_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, now(), now())
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
      [id, ...values]
    );

    await insertAudit(client, id, action, record.atsFinal?.namaPetugas, { atsFinal: record.atsFinal || null });
    const saved = await getRecordByIdWithClient(client, id);
    return saved || record;
  });
}

export async function deleteRecord(id: string) {
  const result = await query("delete from triage_records where id = $1 returning id", [id]);
  return Boolean(result.rowCount);
}
