-- Create a function to get user last sign in information
CREATE OR REPLACE FUNCTION public.get_user_last_sign_in(user_uuid uuid)
RETURNS timestamp with time zone
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT last_sign_in_at 
  FROM auth.users 
  WHERE id = user_uuid;
$$;