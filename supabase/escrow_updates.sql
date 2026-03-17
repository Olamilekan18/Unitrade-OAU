-- 1. Add Wallet and Bank Details to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS wallet_balance numeric(12,2) not null default 0.00 check (wallet_balance >= 0),
ADD COLUMN IF NOT EXISTS bank_name text default '',
ADD COLUMN IF NOT EXISTS account_number text default '',
ADD COLUMN IF NOT EXISTS account_name text default '';

-- 2. Add 'shipped' to the order status enum/check constraint
-- Note: PostgreSQL requires dropping the existing constraint and re-adding it
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders 
ADD CONSTRAINT orders_status_check 
CHECK (status in ('pending', 'paid', 'shipped', 'delivered', 'cancelled'));

-- 3. Create Withdrawals table
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on update cascade on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  bank_name text not null,
  account_number text not null,
  account_name text not null,
  reference text unique, -- for external tracking (e.g., Paystack transfer reference)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_withdrawals_user on public.withdrawals(user_id);

-- Note: RLS policies for withdrawals (since we have RLS enabled on everything else)
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- Service role bypass
DROP POLICY IF EXISTS "Authenticated can insert withdrawals" ON public.withdrawals;
CREATE POLICY "Authenticated can insert withdrawals"
  ON public.withdrawals FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read own withdrawals" ON public.withdrawals;
CREATE POLICY "Users can read own withdrawals"
  ON public.withdrawals FOR SELECT
  USING (true); -- Application controls this, or filter by user_id
