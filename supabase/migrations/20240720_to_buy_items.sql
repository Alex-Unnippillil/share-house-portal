create extension if not exists "pgcrypto";

alter table public.profiles
  add column if not exists household_id uuid;

update public.profiles
set household_id = coalesce(household_id, gen_random_uuid());

alter table public.profiles
  alter column household_id set not null;

create index if not exists profiles_household_id_idx
  on public.profiles (household_id);

create table public.supply_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  name text not null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create unique index supply_items_household_name_key
  on public.supply_items (household_id, lower(name));

alter table public.supply_items enable row level security;

create policy "Household members can view supply items" on public.supply_items
  for select using (
    household_id = (
      select household_id from public.profiles where id = auth.uid()
    )
  );

create policy "Household members can insert supply items" on public.supply_items
  for insert with check (
    household_id = (
      select household_id from public.profiles where id = auth.uid()
    )
    and created_by = auth.uid()
  );

create policy "Household members can update supply items" on public.supply_items
  for update using (
    household_id = (
      select household_id from public.profiles where id = auth.uid()
    )
  ) with check (
    household_id = (
      select household_id from public.profiles where id = auth.uid()
    )
  );

create policy "Household members can delete supply items" on public.supply_items
  for delete using (
    household_id = (
      select household_id from public.profiles where id = auth.uid()
    )
  );

create table public.to_buy_items (
  id uuid primary key default gen_random_uuid(),
  supply_item_id uuid not null references public.supply_items(id) on delete cascade,
  priority text not null check (priority in ('low', 'medium', 'high', 'urgent')),
  household_id uuid not null,
  added_by uuid not null references public.profiles(id) on delete cascade,
  fulfilled_at timestamptz null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index to_buy_items_household_priority_idx on public.to_buy_items (household_id, priority);
create index to_buy_items_supply_idx on public.to_buy_items (supply_item_id);

alter table public.to_buy_items enable row level security;

create policy "Household members can view to-buy items" on public.to_buy_items
  for select using (
    household_id = (
      select household_id from public.profiles where id = auth.uid()
    )
  );

create policy "Household members can insert to-buy items" on public.to_buy_items
  for insert with check (
    household_id = (
      select household_id from public.profiles where id = auth.uid()
    )
    and added_by = auth.uid()
  );

create policy "Household members can update to-buy items" on public.to_buy_items
  for update using (
    household_id = (
      select household_id from public.profiles where id = auth.uid()
    )
  ) with check (
    household_id = (
      select household_id from public.profiles where id = auth.uid()
    )
  );

create policy "Household members can delete to-buy items" on public.to_buy_items
  for delete using (
    household_id = (
      select household_id from public.profiles where id = auth.uid()
    )
  );

create table public.household_purchases (
  id uuid primary key default gen_random_uuid(),
  supply_item_id uuid not null references public.supply_items(id) on delete cascade,
  household_id uuid not null,
  purchased_by uuid not null references public.profiles(id) on delete cascade,
  purchased_at timestamptz not null default timezone('utc'::text, now()),
  notes text null
);

create index household_purchases_household_idx on public.household_purchases (household_id, purchased_at desc);
create index household_purchases_supply_idx on public.household_purchases (supply_item_id);

alter table public.household_purchases enable row level security;

create policy "Household members can view purchases" on public.household_purchases
  for select using (
    household_id = (
      select household_id from public.profiles where id = auth.uid()
    )
  );

create policy "Household members can insert purchases" on public.household_purchases
  for insert with check (
    household_id = (
      select household_id from public.profiles where id = auth.uid()
    )
    and purchased_by = auth.uid()
  );

create policy "Household members can update purchases" on public.household_purchases
  for update using (
    household_id = (
      select household_id from public.profiles where id = auth.uid()
    )
  ) with check (
    household_id = (
      select household_id from public.profiles where id = auth.uid()
    )
  );

create policy "Household members can delete purchases" on public.household_purchases
  for delete using (
    household_id = (
      select household_id from public.profiles where id = auth.uid()
    )
  );

create or replace function public.mark_to_buy_items_fulfilled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.to_buy_items
  set fulfilled_at = coalesce(fulfilled_at, timezone('utc', now()))
  where household_id = new.household_id
    and supply_item_id = new.supply_item_id
    and fulfilled_at is null;

  return new;
end;
$$;

create trigger to_buy_items_auto_fulfill
  after insert on public.household_purchases
  for each row
  execute function public.mark_to_buy_items_fulfilled();

