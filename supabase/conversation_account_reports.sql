create table if not exists public.conversation_reports (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on update cascade on delete cascade,
  reporter_id uuid not null references public.users(id) on update cascade on delete cascade,
  reported_user_id uuid not null references public.users(id) on update cascade on delete cascade,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_conversation_reports_status on public.conversation_reports(status);
create index if not exists idx_conversation_reports_reporter on public.conversation_reports(reporter_id);
create index if not exists idx_conversation_reports_reported on public.conversation_reports(reported_user_id);
create index if not exists idx_conversation_reports_created_at on public.conversation_reports(created_at desc);

alter table public.conversation_reports enable row level security;

drop policy if exists "Users can create conversation reports" on public.conversation_reports;
create policy "Users can create conversation reports"
  on public.conversation_reports for insert
  with check (reporter_id = auth.uid());

drop policy if exists "Users can read own conversation reports" on public.conversation_reports;
create policy "Users can read own conversation reports"
  on public.conversation_reports for select
  using (reporter_id = auth.uid());

create table if not exists public.account_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.users(id) on update cascade on delete cascade,
  reported_user_id uuid not null references public.users(id) on update cascade on delete cascade,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_account_reports_status on public.account_reports(status);
create index if not exists idx_account_reports_reporter on public.account_reports(reporter_id);
create index if not exists idx_account_reports_reported on public.account_reports(reported_user_id);
create index if not exists idx_account_reports_created_at on public.account_reports(created_at desc);

alter table public.account_reports enable row level security;

drop policy if exists "Users can create account reports" on public.account_reports;
create policy "Users can create account reports"
  on public.account_reports for insert
  with check (reporter_id = auth.uid());

drop policy if exists "Users can read own account reports" on public.account_reports;
create policy "Users can read own account reports"
  on public.account_reports for select
  using (reporter_id = auth.uid());
