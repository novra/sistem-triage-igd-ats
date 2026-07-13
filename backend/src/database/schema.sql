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

create table if not exists users (
  id text primary key,
  email text not null unique,
  name text not null,
  password_hash text not null,
  role text not null default 'user' check (role in ('admin', 'user')),
  is_active boolean not null default true,
  must_change_password boolean not null default false,
  created_by text references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

create index if not exists idx_users_email on users (lower(email));

alter table system_events add column if not exists user_id text references users(id) on delete set null;
alter table system_events add column if not exists user_email text;
create index if not exists idx_system_events_user_id on system_events (user_id);

alter table audit_logs add column if not exists user_id text references users(id) on delete set null;
alter table audit_logs add column if not exists user_email text;

alter table triage_records add column if not exists created_by_user_id text references users(id) on delete set null;
create index if not exists idx_triage_records_created_by_user_id on triage_records (created_by_user_id);
