--
-- Ensure every new auth user is provisioned with a corresponding members row.
-- This function is executed via trigger whenever a record is inserted into auth.users.
--

drop trigger if exists provision_member_on_auth_user on auth.users;
drop function if exists public.provision_member_for_auth_user();

create or replace function public.provision_member_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _user_id uuid := new.id;
  _role text := coalesce(new.raw_app_meta_data->>'role', 'tenant');
begin
  -- Skip provisioning when a member row already exists.
  if exists (
    select 1
    from public.members m
    where m.user_id = _user_id
  ) then
    return new;
  end if;

  begin
    insert into public.members (user_id, role)
    values (_user_id, coalesce(_role, 'tenant'))
    on conflict (user_id) do nothing;
  exception
    when others then
      raise log 'public.provision_member_for_auth_user error for user %: %', _user_id, sqlerrm;
      raise;
  end;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'members_user_id_key'
  ) then
    execute 'create unique index members_user_id_key on public.members (user_id)';
  end if;
exception
  when undefined_table then
    raise exception 'public.members table must exist before installing provisioning trigger';
end;
$$;

create trigger provision_member_on_auth_user
after insert on auth.users
for each row execute function public.provision_member_for_auth_user();
