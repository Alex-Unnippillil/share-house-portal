create table public.roles (
  key text primary key,
  label text not null,
  description text,
  created_at timestamp with time zone not null default now()
);

insert into public.roles (key, label)
values
  ('tenant', 'Tenant'),
  ('moderator', 'Moderator'),
  ('admin', 'Admin'),
  ('landlord', 'Landlord')
on conflict (key) do update set label = excluded.label;

create table public.member_roles (
  member_id uuid not null references public.members(id) on delete cascade,
  role text not null references public.roles(key) on delete restrict,
  created_at timestamp with time zone not null default now(),
  constraint member_roles_member_id_role_key unique (member_id, role)
);

create index member_roles_member_id_idx on public.member_roles (member_id);
create index member_roles_role_idx on public.member_roles (role);
