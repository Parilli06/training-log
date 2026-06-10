create table if not exists public.coach_notes (
  id text primary key,
  date date not null,
  note text,
  created_at timestamptz not null default now()
);
