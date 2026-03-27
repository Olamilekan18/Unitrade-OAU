-- SQL to fix marketplace search and filters
-- Run this in your Supabase SQL Editor

-- 1. Ensure is_used column exists with correct type and default
alter table public.products add column if not exists is_used boolean not null default false;

-- 2. Add search_vector for full-text search
alter table public.products add column if not exists search_vector tsvector;

-- 3. Create/Update function to automaticlly refresh search_vector
create or replace function products_search_trigger() returns trigger as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.description, '')), 'B');
  return new;
end
$$ language plpgsql;

-- 4. Set up the trigger
drop trigger if exists trg_products_search on public.products;
create trigger trg_products_search
before insert or update on public.products
for each row execute function products_search_trigger();

-- 5. Initialize search_vector for existing listings
update public.products set search_vector = 
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B');

-- 6. Create GIN index for performance
create index if not exists idx_products_search on public.products using gin(search_vector);
