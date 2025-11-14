-- Add markdown and sanitized HTML fields for resident bios.
alter table if exists public.profiles
  add column if not exists bio_markdown text,
  add column if not exists bio_html text;
