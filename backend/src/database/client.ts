import { Pool, PoolClient } from "pg";
import { env } from "../config/env";
import { logger } from "../logger";

export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: Number(process.env.PG_POOL_MAX || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (error) => {
  logger.error({ err: error }, "Unexpected PostgreSQL pool error");
});

export async function query<T = any>(text: string, params: any[] = []) {
  return pool.query<T>(text, params);
}

export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await callback(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function initDatabase() {
  await query(`
    create table if not exists triage_records (
      id text primary key,
      patient_rm text not null,
      patient_name text not null,
      patient_age integer not null default 0,
      chief_complaint text,
      ats_predicted integer,
      ats_final integer,
      emergency_indicator boolean not null default false,
      payload_json jsonb not null,
      created_by text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create index if not exists idx_triage_records_updated_at on triage_records (updated_at desc);
    create index if not exists idx_triage_records_patient_rm on triage_records (patient_rm);
    create index if not exists idx_triage_records_patient_name on triage_records (lower(patient_name));
    create index if not exists idx_triage_records_chief_complaint on triage_records (lower(chief_complaint));

    create table if not exists audit_logs (
      id text primary key,
      record_id text references triage_records(id) on delete cascade,
      user_name text not null,
      action text not null,
      detail_json jsonb,
      created_at timestamptz not null default now()
    );

    create index if not exists idx_audit_logs_record_id on audit_logs (record_id);
    create index if not exists idx_audit_logs_created_at on audit_logs (created_at desc);

    create table if not exists system_events (
      id text primary key,
      event_type text not null,
      level text not null default 'info',
      provider text,
      model text,
      ats_level integer,
      duration_ms integer,
      message text,
      detail_json jsonb,
      created_at timestamptz not null default now()
    );

    create index if not exists idx_system_events_created_at on system_events (created_at desc);
    create index if not exists idx_system_events_event_type on system_events (event_type);
    create index if not exists idx_system_events_level on system_events (level);
  `);
}
