create table if not exists public.food_entries (
  id text primary key,
  date date not null,
  name text,
  calories integer,
  protein numeric,
  fat numeric,
  carbs numeric,
  image_url text,
  created_at timestamptz not null default now()
);
create index if not exists food_entries_date_idx on public.food_entries(date);
