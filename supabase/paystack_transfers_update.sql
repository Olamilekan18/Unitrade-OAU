-- Add bank_code column to users to support Paystack transfer recipients
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS bank_code text default '';

-- Add bank_code column to withdrawals for tracking
ALTER TABLE public.withdrawals 
ADD COLUMN IF NOT EXISTS bank_code text default '';
