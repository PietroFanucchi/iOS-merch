-- CRITICAL SECURITY FIX: Secure the smtp_settings table from unauthorized access
-- First, check current policies and remove any that might be overly permissive

-- Remove any potentially unsafe policies
DROP POLICY IF EXISTS "Public can view smtp settings" ON public.smtp_settings;
DROP POLICY IF EXISTS "Authenticated users can view smtp settings" ON public.smtp_settings;
DROP POLICY IF EXISTS "Users can view smtp settings" ON public.smtp_settings;

-- Ensure the existing admin-only policy is properly configured
DROP POLICY IF EXISTS "Only admins can manage SMTP settings" ON public.smtp_settings;

-- Create a very restrictive policy that ONLY allows admin access
CREATE POLICY "Only verified admins can manage SMTP settings" 
ON public.smtp_settings 
FOR ALL 
USING (
  -- Only authenticated users who are explicitly admin in profiles table
  auth.uid() IS NOT NULL 
  AND 
  EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  -- Same restriction for inserts/updates
  auth.uid() IS NOT NULL 
  AND 
  EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Ensure RLS is enabled on the table
ALTER TABLE public.smtp_settings ENABLE ROW LEVEL SECURITY;

-- Add additional security: ensure no SELECT access without the policy
REVOKE ALL ON public.smtp_settings FROM PUBLIC;
REVOKE ALL ON public.smtp_settings FROM anon;
REVOKE ALL ON public.smtp_settings FROM authenticated;

-- Grant only what's needed to authenticated role, but RLS will still control access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.smtp_settings TO authenticated;