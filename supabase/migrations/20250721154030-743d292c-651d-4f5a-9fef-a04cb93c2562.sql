-- Update user role to admin for pietrofanucchi@gmail.com
UPDATE public.profiles 
SET role = 'admin'::public.user_role 
WHERE email = 'pietrofanucchi@gmail.com';