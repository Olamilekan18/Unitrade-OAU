-- Create table to track blacklisted JWT tokens
create table if not exists public.blacklisted_tokens (
  id uuid primary key default gen_random_uuid(),
  jti text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Index for fast lookups during authentication
create index if not exists idx_blacklisted_tokens_jti on public.blacklisted_tokens(jti);

-- Function to automatically clean up expired tokens from the blacklist
create or replace function public.cleanup_expired_tokens()
returns void
language plpgsql
security definer
as $$
begin
  delete from public.blacklisted_tokens where expires_at < now();
end;
$$;

-- Note: In a production environment with pg_cron, you could schedule this function:
-- select cron.schedule('cleanup_tokens', '0 * * * *', 'select public.cleanup_expired_tokens()');

alter table public.blacklisted_tokens enable row level security;

-- Only service role can access this table (our backend bypassing RLS)
drop policy if exists "No client access to blacklisted tokens" on public.blacklisted_tokens;
create policy "No client access to blacklisted tokens"
  on public.blacklisted_tokens for select
  using (false);
