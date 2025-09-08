-- Remove the problematic public read policy from stores
DROP POLICY IF EXISTS "Public can view stores for price tags" ON public.stores;

-- Create a safe view that exposes only non-sensitive store information
CREATE OR REPLACE VIEW public.stores_public AS
SELECT 
  id,
  name,
  chain,
  location,
  tables_count,
  has_digital_price_tags,
  created_at,
  updated_at
FROM public.stores;

-- Make the view publicly readable
GRANT SELECT ON public.stores_public TO anon, authenticated;

-- Enable RLS on the view (though it will be public)
ALTER VIEW public.stores_public SET (security_barrier = true);

-- Create a public policy for the view
CREATE POLICY "Public can view non-sensitive store data" 
ON public.stores_public
FOR SELECT 
TO public
USING (true);