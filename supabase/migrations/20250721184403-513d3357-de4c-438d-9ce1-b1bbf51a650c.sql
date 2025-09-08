-- Add price_tags column to tables
ALTER TABLE public.tables 
ADD COLUMN price_tags jsonb DEFAULT '[]'::jsonb;