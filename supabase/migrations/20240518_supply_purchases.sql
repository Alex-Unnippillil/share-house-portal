-- Supply purchases schema and automation
create extension if not exists "pgcrypto";

-- Core household tables -----------------------------------------------------
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  created_by uuid default auth.uid(),
  constraint households_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null
);

alter table public.households enable row level security;

create table if not exists public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  profile_id uuid not null default auth.uid(),
  default_supply_split numeric not null default 1,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint household_members_household_id_fkey foreign key (household_id) references public.households(id) on delete cascade,
  constraint household_members_profile_id_fkey foreign key (profile_id) references public.profiles(id) on delete cascade,
  constraint household_members_default_supply_split_check check (default_supply_split >= 0),
  constraint household_members_household_id_profile_id_key unique (household_id, profile_id)
);

alter table public.household_members enable row level security;

-- Supply purchase tables ----------------------------------------------------
create table if not exists public.supply_purchases (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  item_name text not null,
  price_cad numeric(12, 2),
  amount numeric(12, 2) not null default 1,
  purchased_at timestamp with time zone not null default timezone('utc'::text, now()),
  buyer_id uuid,
  receipt_url text,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint supply_purchases_household_id_fkey foreign key (household_id) references public.households(id) on delete cascade,
  constraint supply_purchases_buyer_id_fkey foreign key (buyer_id) references public.profiles(id) on delete restrict
);

alter table public.supply_purchases enable row level security;

alter table public.supply_purchases
  add column if not exists price_cad numeric(12, 2);

alter table public.supply_purchases
  add column if not exists amount numeric(12, 2) not null default 1;

alter table public.supply_purchases
  add column if not exists buyer_id uuid;

alter table public.supply_purchases
  add column if not exists receipt_url text;

alter table public.supply_purchases
  add column if not exists created_at timestamp with time zone not null default timezone('utc'::text, now());

alter table public.supply_purchases
  alter column price_cad set not null,
  alter column amount set default 1,
  alter column buyer_id set not null,
  add constraint supply_purchases_price_cad_check check (price_cad >= 0),
  add constraint supply_purchases_amount_check check (amount > 0);

create index if not exists supply_purchases_household_id_idx
  on public.supply_purchases (household_id);

create table if not exists public.supply_shares (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null,
  profile_id uuid not null,
  share_amount numeric(12, 2) not null,
  share_ratio numeric not null,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint supply_shares_purchase_id_fkey foreign key (purchase_id) references public.supply_purchases(id) on delete cascade,
  constraint supply_shares_profile_id_fkey foreign key (profile_id) references public.profiles(id) on delete cascade,
  constraint supply_shares_purchase_id_profile_id_key unique (purchase_id, profile_id)
);

alter table public.supply_shares enable row level security;

create index if not exists supply_shares_purchase_id_idx
  on public.supply_shares (purchase_id);

create index if not exists household_members_household_id_idx
  on public.household_members (household_id);

-- Storage bucket for receipts ------------------------------------------------
insert into storage.buckets (id, name, public)
values ('supply-receipts', 'supply-receipts', false)
on conflict (id) do nothing;

drop policy if exists "Authenticated manage supply receipts" on storage.objects;
create policy "Authenticated manage supply receipts"
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'supply-receipts'
    and (owner = auth.uid())
  )
  with check (
    bucket_id = 'supply-receipts'
    and (owner = auth.uid())
  );

-- Policies ------------------------------------------------------------------
drop policy if exists "Members can view their households" on public.households;
create policy "Members can view their households"
  on public.households
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.household_members hm
      where hm.household_id = id
        and hm.profile_id = auth.uid()
    )
  );

drop policy if exists "Members manage their households" on public.households;
create policy "Members manage their households"
  on public.households
  for all
  to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1
      from public.household_members hm
      where hm.household_id = id
        and hm.profile_id = auth.uid()
    )
  )
  with check (
    created_by = auth.uid()
    or exists (
      select 1
      from public.household_members hm
      where hm.household_id = id
        and hm.profile_id = auth.uid()
    )
  );

drop policy if exists "Members view household peers" on public.household_members;
create policy "Members view household peers"
  on public.household_members
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.household_members hm
      where hm.household_id = household_members.household_id
        and hm.profile_id = auth.uid()
    )
  );

drop policy if exists "Members can join households" on public.household_members;
create policy "Members can join households"
  on public.household_members
  for insert
  to authenticated
  with check (
    profile_id = auth.uid()
    and exists (
      select 1
      from public.households h
      where h.id = household_id
    )
  );

drop policy if exists "Members manage household memberships" on public.household_members;
create policy "Members manage household memberships"
  on public.household_members
  for update
  to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop policy if exists "Members leave households" on public.household_members;
create policy "Members leave households"
  on public.household_members
  for delete
  to authenticated
  using (profile_id = auth.uid());

drop policy if exists "Members view supply purchases" on public.supply_purchases;
create policy "Members view supply purchases"
  on public.supply_purchases
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.household_members hm
      where hm.household_id = supply_purchases.household_id
        and hm.profile_id = auth.uid()
    )
  );

drop policy if exists "Members create supply purchases" on public.supply_purchases;
create policy "Members create supply purchases"
  on public.supply_purchases
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.household_members hm
      where hm.household_id = supply_purchases.household_id
        and hm.profile_id = auth.uid()
    )
  );

drop policy if exists "Members update supply purchases" on public.supply_purchases;
create policy "Members update supply purchases"
  on public.supply_purchases
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.household_members hm
      where hm.household_id = supply_purchases.household_id
        and hm.profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.household_members hm
      where hm.household_id = supply_purchases.household_id
        and hm.profile_id = auth.uid()
    )
  );

drop policy if exists "Members delete supply purchases" on public.supply_purchases;
create policy "Members delete supply purchases"
  on public.supply_purchases
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.household_members hm
      where hm.household_id = supply_purchases.household_id
        and hm.profile_id = auth.uid()
    )
  );

drop policy if exists "Members view supply shares" on public.supply_shares;
create policy "Members view supply shares"
  on public.supply_shares
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.supply_purchases sp
      join public.household_members hm on hm.household_id = sp.household_id
      where sp.id = supply_shares.purchase_id
        and hm.profile_id = auth.uid()
    )
  );

drop policy if exists "Members manage supply shares" on public.supply_shares;
create policy "Members manage supply shares"
  on public.supply_shares
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.supply_purchases sp
      join public.household_members hm on hm.household_id = sp.household_id
      where sp.id = supply_shares.purchase_id
        and hm.profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.supply_purchases sp
      join public.household_members hm on hm.household_id = sp.household_id
      where sp.id = supply_shares.purchase_id
        and hm.profile_id = auth.uid()
    )
  );

-- Trigger to maintain supply shares ----------------------------------------
create or replace function public.create_supply_shares_for_purchase()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  member record;
  total_cost numeric := coalesce(new.price_cad, 0) * coalesce(new.amount, 1);
  weight_sum numeric := 0;
  member_count integer := 0;
  share_ratio numeric;
begin
  select coalesce(sum(default_supply_split), 0), count(*)
    into weight_sum, member_count
  from public.household_members
  where household_id = new.household_id;

  if member_count = 0 then
    return new;
  end if;

  delete from public.supply_shares where purchase_id = new.id;

  for member in
    select profile_id, default_supply_split
    from public.household_members
    where household_id = new.household_id
  loop
    if weight_sum <= 0 then
      share_ratio := 1::numeric / member_count;
    else
      share_ratio := coalesce(member.default_supply_split, 0) / weight_sum;
    end if;

    insert into public.supply_shares (purchase_id, profile_id, share_amount, share_ratio)
    values (
      new.id,
      member.profile_id,
      round(total_cost * share_ratio, 2),
      share_ratio
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists supply_purchases_create_shares on public.supply_purchases;
create trigger supply_purchases_create_shares
  after insert or update on public.supply_purchases
  for each row
  execute function public.create_supply_shares_for_purchase();
