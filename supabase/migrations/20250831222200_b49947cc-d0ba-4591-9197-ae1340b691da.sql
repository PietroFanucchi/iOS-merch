-- Fix the profiles table security issue by updating the SELECT policy
-- Remove the existing potentially vulnerable policy
DROP POLICY IF EXISTS "Users can view own profile, admins can view all" ON public.profiles;

-- Create a more secure policy that explicitly restricts access
CREATE POLICY "Users can view own profile, admins can view all" 
ON public.profiles 
FOR SELECT 
USING (
  -- Users can only see their own profile
  auth.uid() = user_id 
  OR 
  -- Or if they are explicitly an admin (using our secure is_admin function)
  (
    auth.uid() IS NOT NULL 
    AND 
    EXISTS (
      SELECT 1 
      FROM public.profiles admin_profiles 
      WHERE admin_profiles.user_id = auth.uid() 
      AND admin_profiles.role = 'admin'
    )
  )
);

-- Ensure the profiles table cannot be accessed without authentication
-- Remove any overly permissive policies if they exist
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

-- Ensure the is_admin function is properly secured
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE user_id = user_uuid AND role = 'admin'
  );
$$;