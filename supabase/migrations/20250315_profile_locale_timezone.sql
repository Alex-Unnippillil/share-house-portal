alter table public.profiles
  add column if not exists locale text;

alter table public.profiles
  add column if not exists timezone text;
