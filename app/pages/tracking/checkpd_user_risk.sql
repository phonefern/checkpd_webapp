create table public.checkpd_user_risk (
  user_id text not null,
  kind text not null,
  province text null,
  latest_status text null,
  latest_record_at timestamp with time zone null,
  parent_timestamp timestamp with time zone null,
  updated_at timestamp with time zone null default now(),
  constraint checkpd_user_risk_pkey primary key (kind, user_id)
) TABLESPACE pg_default;