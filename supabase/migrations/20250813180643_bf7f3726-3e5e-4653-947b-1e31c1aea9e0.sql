-- Fix security vulnerability: Restrict store data access to authenticated users only
-- This prevents competitors from harvesting sensitive contact information

-- Drop the current public access policy
DROP POLICY IF EXISTS "Stores are viewable by everyone" ON public.stores;

-- Create new policy requiring authentication for store data access
CREATE POLICY "Authenticated users can view stores" 
ON public.stores 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Keep admin-only policies for write operations unchanged
-- (These were already properly secured)