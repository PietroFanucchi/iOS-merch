-- Fix security vulnerability: Restrict profile access to owner and admins only
-- This prevents users from accessing other users' email addresses

-- Drop the current overly permissive policy
DROP POLICY IF EXISTS "Profiles are viewable by all authenticated users" ON public.profiles;

-- Create new policy allowing users to see only their own profile, or admins to see all
CREATE POLICY "Users can view own profile, admins can view all" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id OR is_admin());

-- Keep existing insert/update policies unchanged as they're already properly secured