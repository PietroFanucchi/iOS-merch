-- Add city and role fields to tacticians table
ALTER TABLE public.tacticians 
ADD COLUMN city TEXT,
ADD COLUMN role TEXT NOT NULL DEFAULT 'tattico' CHECK (role IN ('tattico', 'BA'));