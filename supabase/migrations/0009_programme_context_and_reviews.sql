create table if not exists public.programme_context (
  id integer primary key default 1,
  context text default '',
  updated_at timestamptz default now(),
  constraint programme_context_single_row check (id = 1)
);
insert into public.programme_context (id, context) values (1, '') on conflict do nothing;

create table if not exists public.session_reviews (
  id text primary key default gen_random_uuid()::text,
  session_id text references public.sessions(id) on delete cascade,
  date date,
  review text,
  garmin_data jsonb,
  created_at timestamptz not null default now()
);
