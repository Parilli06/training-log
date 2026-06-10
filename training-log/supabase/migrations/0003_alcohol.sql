create table if not exists public.alcohol_entries (
  id text primary key,
  date date not null,
  drink_type text,
  drink_name text,
  quantity numeric default 1,
  units numeric,
  calories integer,
  venue text,
  created_at timestamptz not null default now()
);
create index if not exists alcohol_entries_date_idx on public.alcohol_entries(date);
