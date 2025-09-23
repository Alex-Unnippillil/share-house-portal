-- Create table to track per-user onboarding progress
create table if not exists public.onboarding_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  confirmed_unit boolean not null default false,
  confirmed_unit_at timestamptz,
  added_payment_method boolean not null default false,
  added_payment_method_at timestamptz,
  invited_roommate boolean not null default false,
  invited_roommate_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_onboarding_progress_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_onboarding_progress_updated_at on public.onboarding_progress;

create trigger set_onboarding_progress_updated_at
before update on public.onboarding_progress
for each row
execute function public.set_onboarding_progress_updated_at();
