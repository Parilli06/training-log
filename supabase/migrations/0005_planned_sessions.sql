create table if not exists public.planned_sessions (
  id text primary key,
  date date not null,
  plan text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists planned_sessions_date_idx on public.planned_sessions(date);
