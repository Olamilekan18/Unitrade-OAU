-- Enable RLS and add policies for conversations + messages.

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Conversations: only buyer/seller can read
drop policy if exists "Participants can read conversations" on public.conversations;
create policy "Participants can read conversations"
  on public.conversations for select
  using (buyer_id = auth.uid() or seller_id = auth.uid());

-- Conversations: only buyer/seller can create (if they are the buyer)
drop policy if exists "Buyer can create conversation" on public.conversations;
create policy "Buyer can create conversation"
  on public.conversations for insert
  with check (buyer_id = auth.uid());

-- Conversations: participants can update (e.g., updated_at)
drop policy if exists "Participants can update conversations" on public.conversations;
create policy "Participants can update conversations"
  on public.conversations for update
  using (buyer_id = auth.uid() or seller_id = auth.uid())
  with check (buyer_id = auth.uid() or seller_id = auth.uid());

-- Messages: participants can read
drop policy if exists "Participants can read messages" on public.messages;
create policy "Participants can read messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = public.messages.conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

-- Messages: sender can insert (must be part of conversation)
drop policy if exists "Participants can send messages" on public.messages;
create policy "Participants can send messages"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = public.messages.conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

-- Messages: sender can update their own (e.g., edit) and receiver can mark as read
drop policy if exists "Participants can update messages" on public.messages;
create policy "Participants can update messages"
  on public.messages for update
  using (
    sender_id = auth.uid()
    or exists (
      select 1 from public.conversations c
      where c.id = public.messages.conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  )
  with check (
    sender_id = auth.uid()
    or exists (
      select 1 from public.conversations c
      where c.id = public.messages.conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );
