-- chore swap workflow schema additions

create table if not exists public.chore_assignments (
  id bigint generated always as identity primary key,
  assignment_label text not null,
  assignment_date date not null,
  assigned_profile_id uuid not null references public.profiles(id) on delete cascade,
  credits integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id) on delete cascade
);

create index if not exists chore_assignments_assigned_profile_id_idx on public.chore_assignments (assigned_profile_id);
create index if not exists chore_assignments_assignment_date_idx on public.chore_assignments (assignment_date);

create table if not exists public.chore_swaps (
  id bigint generated always as identity primary key,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  counterparty_id uuid not null references public.profiles(id) on delete cascade,
  requester_assignment_id bigint not null references public.chore_assignments(id) on delete cascade,
  counterparty_assignment_id bigint not null references public.chore_assignments(id) on delete cascade,
  proposed_credit_transfer integer not null default 0 check (proposed_credit_transfer >= 0),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  message text null,
  created_at timestamptz not null default now(),
  responded_at timestamptz null,
  responded_by uuid null references public.profiles(id),
  decline_reason text null
);

create index if not exists chore_swaps_requester_id_idx on public.chore_swaps (requester_id);
create index if not exists chore_swaps_counterparty_id_idx on public.chore_swaps (counterparty_id);
create index if not exists chore_swaps_status_idx on public.chore_swaps (status);

alter table public.chore_swaps
  add constraint chore_swaps_requester_assignment_matches
  check (
    requester_assignment_id is null
    or exists (
      select 1
      from public.chore_assignments a
      where a.id = requester_assignment_id
        and a.assigned_profile_id = requester_id
    )
  );

alter table public.chore_swaps
  add constraint chore_swaps_counterparty_assignment_matches
  check (
    counterparty_assignment_id is null
    or exists (
      select 1
      from public.chore_assignments a
      where a.id = counterparty_assignment_id
        and a.assigned_profile_id = counterparty_id
    )
  );

create table if not exists public.chore_credit_ledger (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  swap_id bigint null references public.chore_swaps(id) on delete set null,
  amount integer not null,
  reason text not null,
  recorded_at timestamptz not null default now(),
  recorded_by uuid not null references public.profiles(id) on delete cascade
);

create index if not exists chore_credit_ledger_profile_id_idx on public.chore_credit_ledger (profile_id);
create index if not exists chore_credit_ledger_swap_id_idx on public.chore_credit_ledger (swap_id);

alter table public.chore_assignments enable row level security;
alter table public.chore_swaps enable row level security;
alter table public.chore_credit_ledger enable row level security;

create policy if not exists "Roommates can view their assignments" on public.chore_assignments
  for select
  using (
    assigned_profile_id = auth.uid()
    or created_by = auth.uid()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('property_manager', 'admin')
    )
  );

create policy if not exists "Property team manages assignments" on public.chore_assignments
  for all
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('property_manager', 'admin')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('property_manager', 'admin')
    )
  );

create policy if not exists "Participants can view chore swaps" on public.chore_swaps
  for select
  using (
    requester_id = auth.uid()
    or counterparty_id = auth.uid()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('property_manager', 'admin')
    )
  );

create policy if not exists "Requesters can create chore swaps" on public.chore_swaps
  for insert
  with check (
    requester_id = auth.uid()
    and status = 'pending'
  );

create policy if not exists "Participants manage pending chore swaps" on public.chore_swaps
  for update
  using (
    requester_id = auth.uid()
    or counterparty_id = auth.uid()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('property_manager', 'admin')
    )
  )
  with check (
    requester_id = auth.uid()
    or counterparty_id = auth.uid()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('property_manager', 'admin')
    )
  );

create policy if not exists "Property team can remove chore swaps" on public.chore_swaps
  for delete
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('property_manager', 'admin')
    )
  );

create policy if not exists "Roommates can view their ledger entries" on public.chore_credit_ledger
  for select
  using (
    profile_id = auth.uid()
    or recorded_by = auth.uid()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('property_manager', 'admin')
    )
  );

create policy if not exists "Property team manages ledger" on public.chore_credit_ledger
  for all
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('property_manager', 'admin')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('property_manager', 'admin')
    )
  );

create or replace function public.accept_chore_swap(p_swap_id bigint)
returns public.chore_swaps
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_swap public.chore_swaps%rowtype;
  v_requester_assignment public.chore_assignments%rowtype;
  v_counter_assignment public.chore_assignments%rowtype;
begin
  select *
    into v_swap
  from public.chore_swaps
  where id = p_swap_id
  for update;

  if not found then
    raise exception 'Chore swap % was not found', p_swap_id;
  end if;

  if v_swap.status <> 'pending' then
    raise exception 'Chore swap % is not pending', p_swap_id;
  end if;

  if v_swap.counterparty_id <> auth.uid() then
    raise exception 'Only the counterparty can accept chore swap %', p_swap_id;
  end if;

  select * into v_requester_assignment
  from public.chore_assignments
  where id = v_swap.requester_assignment_id
  for update;

  select * into v_counter_assignment
  from public.chore_assignments
  where id = v_swap.counterparty_assignment_id
  for update;

  update public.chore_assignments
     set assigned_profile_id = v_swap.counterparty_id,
         updated_at = now()
   where id = v_swap.requester_assignment_id;

  update public.chore_assignments
     set assigned_profile_id = v_swap.requester_id,
         updated_at = now()
   where id = v_swap.counterparty_assignment_id;

  update public.chore_swaps
     set status = 'accepted',
         responded_at = now(),
         responded_by = auth.uid(),
         decline_reason = null
   where id = p_swap_id;

  if v_swap.proposed_credit_transfer <> 0 then
    insert into public.chore_credit_ledger (profile_id, swap_id, amount, reason, recorded_by)
    values
      (v_swap.requester_id, v_swap.id, -v_swap.proposed_credit_transfer, 'Chore swap credit transfer', auth.uid()),
      (v_swap.counterparty_id, v_swap.id, v_swap.proposed_credit_transfer, 'Chore swap credit transfer', auth.uid());
  end if;

  return (
    select cs from public.chore_swaps cs where cs.id = p_swap_id
  );
end;
$$;

grant execute on function public.accept_chore_swap to authenticated;

create or replace function public.decline_chore_swap(p_swap_id bigint, p_reason text default null)
returns public.chore_swaps
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_swap public.chore_swaps%rowtype;
begin
  select *
    into v_swap
  from public.chore_swaps
  where id = p_swap_id
  for update;

  if not found then
    raise exception 'Chore swap % was not found', p_swap_id;
  end if;

  if v_swap.status <> 'pending' then
    raise exception 'Chore swap % is not pending', p_swap_id;
  end if;

  if v_swap.counterparty_id <> auth.uid() then
    raise exception 'Only the counterparty can decline chore swap %', p_swap_id;
  end if;

  update public.chore_swaps
     set status = 'declined',
         responded_at = now(),
         responded_by = auth.uid(),
         decline_reason = p_reason
   where id = p_swap_id;

  return (
    select cs from public.chore_swaps cs where cs.id = p_swap_id
  );
end;
$$;

grant execute on function public.decline_chore_swap to authenticated;
