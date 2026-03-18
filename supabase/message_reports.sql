create table if not exists public.message_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on update cascade on delete cascade,
  conversation_id uuid not null references public.conversations(id) on update cascade on delete cascade,
  reporter_id uuid not null references public.users(id) on update cascade on delete cascade,
  reported_user_id uuid not null references public.users(id) on update cascade on delete cascade,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_message_reports_status on public.message_reports(status);
create index if not exists idx_message_reports_reporter on public.message_reports(reporter_id);
create index if not exists idx_message_reports_reported on public.message_reports(reported_user_id);
create index if not exists idx_message_reports_created_at on public.message_reports(created_at desc);

alter table public.message_reports enable row level security;

drop policy if exists "Users can create message reports" on public.message_reports;
create policy "Users can create message reports"
  on public.message_reports for insert
  with check (reporter_id = auth.uid());

drop policy if exists "Users can read own message reports" on public.message_reports;
create policy "Users can read own message reports"
  on public.message_reports for select
  using (reporter_id = auth.uid());
