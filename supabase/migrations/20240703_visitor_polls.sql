create extension if not exists "pgcrypto";

create type if not exists public.visitor_request_status as enum ('pending_vote', 'approved', 'denied');
create type if not exists public.poll_status as enum ('open', 'closed');
create type if not exists public.poll_outcome as enum ('approved', 'denied', 'tie');
create type if not exists public.poll_vote_choice as enum ('approve', 'deny');

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  building_id uuid not null,
  entity_type text not null,
  entity_id uuid not null,
  event_type text not null,
  actor_id uuid references auth.users(id),
  metadata jsonb
);

create table if not exists public.visitor_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  building_id uuid not null,
  host_profile_id uuid not null references public.profiles(id),
  guest_name text not null,
  arrival_date date not null,
  departure_date date not null,
  reason text,
  status public.visitor_request_status not null default 'pending_vote',
  requires_vote boolean not null default true,
  approved_at timestamptz,
  denied_at timestamptz,
  approved_by uuid references auth.users(id),
  denied_by uuid references auth.users(id),
  constraint visitor_requests_date_check check (departure_date >= arrival_date)
);

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  building_id uuid not null,
  created_by uuid references auth.users(id),
  visitor_request_id uuid unique references public.visitor_requests(id),
  question text not null,
  status public.poll_status not null default 'open',
  outcome public.poll_outcome,
  required_votes integer not null,
  metadata jsonb
);

create table if not exists public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  poll_id uuid not null references public.polls(id) on delete cascade,
  voter_id uuid not null references auth.users(id),
  choice public.poll_vote_choice not null,
  constraint poll_votes_unique_vote unique (poll_id, voter_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create trigger set_visitor_requests_updated_at
before update on public.visitor_requests
for each row
execute function public.set_updated_at();

create trigger set_polls_updated_at
before update on public.polls
for each row
execute function public.set_updated_at();

create or replace function public.handle_poll_vote_change()
returns trigger
language plpgsql
as $$
declare
  v_poll_id uuid;
  v_required integer;
  v_approvals integer;
  v_denials integer;
  v_total integer;
  v_outcome public.poll_outcome;
begin
  v_poll_id := coalesce(new.poll_id, old.poll_id);
  if v_poll_id is null then
    return null;
  end if;

  select required_votes
    into v_required
    from public.polls
   where id = v_poll_id
   for update;

  if not found then
    return null;
  end if;

  select count(*) filter (where choice = 'approve'),
         count(*) filter (where choice = 'deny')
    into v_approvals, v_denials
    from public.poll_votes
   where poll_id = v_poll_id;

  v_total := coalesce(v_approvals, 0) + coalesce(v_denials, 0);
  v_required := greatest(coalesce(v_required, 0), 1);

  if v_total >= v_required then
    if coalesce(v_approvals, 0) = coalesce(v_denials, 0) then
      v_outcome := 'tie';
    elsif coalesce(v_approvals, 0) > coalesce(v_denials, 0) then
      v_outcome := 'approved';
    else
      v_outcome := 'denied';
    end if;

    update public.polls
       set status = 'closed',
           outcome = v_outcome
     where id = v_poll_id
       and status <> 'closed';
  end if;

  return null;
end;
$$;

create trigger poll_votes_handle_change
after insert or update or delete on public.poll_votes
for each row
execute function public.handle_poll_vote_change();

create or replace function public.handle_poll_completion()
returns trigger
language plpgsql
as $$
declare
  v_building_id uuid;
  v_event_type text;
  v_metadata jsonb;
begin
  if (new.status is distinct from old.status) or (new.outcome is distinct from old.outcome) then
    if new.status = 'closed' and new.visitor_request_id is not null and new.outcome is not null then
      if new.outcome = 'approved' then
        update public.visitor_requests
           set status = 'approved',
               approved_at = timezone('utc', now()),
               approved_by = new.created_by,
               denied_at = null,
               denied_by = null,
               requires_vote = false
         where id = new.visitor_request_id
           and status <> 'approved'
        returning building_id into v_building_id;

        if found then
          v_event_type := 'visitor_request.approved';
          v_metadata := jsonb_build_object('poll_id', new.id, 'outcome', new.outcome);
          insert into public.events (building_id, entity_type, entity_id, event_type, actor_id, metadata)
          values (v_building_id, 'visitor_request', new.visitor_request_id, v_event_type, new.created_by, v_metadata);
        end if;
      else
        update public.visitor_requests
           set status = 'denied',
               denied_at = timezone('utc', now()),
               denied_by = new.created_by,
               approved_at = null,
               approved_by = null,
               requires_vote = false
         where id = new.visitor_request_id
           and status <> 'denied'
        returning building_id into v_building_id;

        if found then
          v_event_type := 'visitor_request.denied';
          v_metadata := jsonb_build_object('poll_id', new.id, 'outcome', new.outcome);
          insert into public.events (building_id, entity_type, entity_id, event_type, actor_id, metadata)
          values (v_building_id, 'visitor_request', new.visitor_request_id, v_event_type, new.created_by, v_metadata);
        end if;
      end if;
    end if;
  end if;

  return new;
end;
$$;

create trigger poll_completion
after update on public.polls
for each row
execute function public.handle_poll_completion();
