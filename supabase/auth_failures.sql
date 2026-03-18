-- Add auth_failures tracking column
alter table public.users add column if not exists auth_failures integer not null default 0;
