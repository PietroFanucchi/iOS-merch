-- Remove the problematic public read policy from stores
DROP POLICY IF EXISTS "Public can view stores for price tags" ON public.stores;

-- Create a security definer function that returns only non-sensitive store data
CREATE OR REPLACE FUNCTION public.get_stores_public()
RETURNS TABLE(
  id uuid,
  name text,
  chain text,
  location text,
  tables_count integer,
  has_digital_price_tags boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
) 
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT 
    s.id,
    s.name,
    s.chain,
    s.location,
    s.tables_count,
    s.has_digital_price_tags,
    s.created_at,
    s.updated_at
  FROM public.stores s;
$$;

-- Grant execute permissions to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION public.get_stores_public() TO anon, authenticated;