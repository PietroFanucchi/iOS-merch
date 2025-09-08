-- Remove existing problematic RLS policies for profiles table
DROP POLICY IF EXISTS "Users can view own profile, admins can view all" ON public.profiles;

-- Create new, simpler RLS policies without recursion
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles admin_check 
    WHERE admin_check.user_id = auth.uid() 
    AND admin_check.role = 'admin'
  )
);

-- Update other policies to be simpler
DROP POLICY IF EXISTS "Users can update own profile, admins can update all" ON public.profiles;

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles admin_check 
    WHERE admin_check.user_id = auth.uid() 
    AND admin_check.role = 'admin'
  )
);