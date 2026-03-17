-- Update the checkout status constraint to include 'seller_delivered'
-- First, drop the existing constraint
ALTER TABLE public.orders DROP CONSTRAINT orders_status_check;

-- Re-add the constraint with 'seller_delivered' included
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending', 'paid', 'shipped', 'seller_delivered', 'delivered', 'cancelled'));
