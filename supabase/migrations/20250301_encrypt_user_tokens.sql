alter table public.user_tokens
  add column if not exists key_id text;

update public.user_tokens
set key_id = coalesce(key_id, 'legacy');

alter table public.user_tokens
  alter column key_id set not null;
