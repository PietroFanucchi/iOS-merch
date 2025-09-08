-- Update category check constraint to use "Tier 2" instead of "Tier2"
ALTER TABLE public.stores DROP CONSTRAINT stores_category_check;
ALTER TABLE public.stores ADD CONSTRAINT stores_category_check CHECK (category IN ('White', 'Tier 2'));