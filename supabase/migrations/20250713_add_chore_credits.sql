create table if not exists public.chore_credits (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  member_id uuid not null,
  assignment_id uuid not null,
  credits_delta integer not null,
  reason text not null
);

comment on table public.chore_credits is 'Ledger of credit movements for household chore assignments.';
comment on column public.chore_credits.member_id is 'Profile identifier receiving or surrendering credits.';
comment on column public.chore_credits.assignment_id is 'Chore assignment linked to the credit adjustment.';
comment on column public.chore_credits.credits_delta is 'Positive values add credits, negative values remove credits.';
comment on column public.chore_credits.reason is 'Human readable explanation for the credit change.';

create index if not exists chore_credits_member_idx on public.chore_credits (member_id);
create index if not exists chore_credits_assignment_idx on public.chore_credits (assignment_id);
