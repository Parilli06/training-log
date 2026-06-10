-- Sessions table (base table, predates numbered migrations)
create table if not exists public.sessions (
  id text primary key,
  date date,
  day_id text,
  day_name text,
  day_type text,
  exercises jsonb default '[]'::jsonb,
  complexes jsonb default '[]'::jsonb,
  cardio_activities jsonb default '[]'::jsonb,
  notes text,
  rpe numeric,
  created_at timestamptz not null default now()
);
