-- Update the profiles UPDATE policy to allow admins to update any profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update own profile, admins can update all" 
ON public.profiles 
FOR UPDATE 
USING ((auth.uid() = user_id) OR is_admin());