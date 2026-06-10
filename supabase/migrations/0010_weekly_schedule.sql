create table if not exists public.weekly_schedule (
  id serial primary key,
  day_of_week text unique not null,
  display_name text,
  workout_type text default 'rest',
  macro_bucket text default 'rest',
  updated_at timestamptz default now()
);

-- Default schedule
insert into public.weekly_schedule (day_of_week, display_name, workout_type, macro_bucket) values
  ('monday',    'Upper Push',    'upper_push',  'lifting'),
  ('tuesday',   'Upper Pull',    'upper_pull',  'lifting'),
  ('wednesday', 'Rest',          'rest',        'rest'),
  ('thursday',  'Lower (Squat)', 'lower_squat', 'lifting'),
  ('friday',    'Olympic',       'olympic',     'big'),
  ('saturday',  'Cardio',        'cardio',      'lifting'),
  ('sunday',    'Rest',          'rest',        'rest')
on conflict (day_of_week) do nothing;
