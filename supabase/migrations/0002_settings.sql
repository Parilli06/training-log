create table if not exists public.settings (
  id integer primary key default 1,
  key_lifts jsonb default '[]'::jsonb,
  weekly_alcohol_limit numeric default 14,
  updated_at timestamptz default now(),
  constraint settings_single_row check (id = 1)
);
-- seed default row
insert into public.settings (id) values (1) on conflict do nothing;
