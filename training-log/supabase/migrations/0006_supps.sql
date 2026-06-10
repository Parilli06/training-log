create table if not exists public.supps_entries (
  id text primary key,
  date date not null,
  name text not null,
  dose text,
  type text default 'supplement',
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists supps_entries_date_idx on public.supps_entries(date);
