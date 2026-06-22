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
