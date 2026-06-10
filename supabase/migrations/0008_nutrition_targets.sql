create table if not exists public.nutrition_targets (
  id integer primary key default 1,
  calories_rest integer default 2000,
  protein_rest integer default 160,
  fat_rest integer default 70,
  carbs_rest integer default 150,
  calories_lifting integer default 2500,
  protein_lifting integer default 180,
  fat_lifting integer default 80,
  carbs_lifting integer default 250,
  calories_big integer default 3000,
  protein_big integer default 200,
  fat_big integer default 90,
  carbs_big integer default 350,
  updated_at timestamptz default now(),
  constraint nutrition_targets_single_row check (id = 1)
);
insert into public.nutrition_targets (id) values (1) on conflict do nothing;
