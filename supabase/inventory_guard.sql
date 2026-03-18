-- Prevent negative inventory values at the database layer.

-- 1) Add/ensure check constraint
alter table public.products
  drop constraint if exists products_quantity_nonnegative;

alter table public.products
  add constraint products_quantity_nonnegative
  check (quantity >= 0);

-- 2) Optional trigger to raise a clearer error message
create or replace function public.prevent_negative_quantity()
returns trigger as $$
begin
  if new.quantity < 0 then
    raise exception 'Quantity cannot be negative.';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists products_prevent_negative_quantity on public.products;

create trigger products_prevent_negative_quantity
before insert or update of quantity
on public.products
for each row execute function public.prevent_negative_quantity();
