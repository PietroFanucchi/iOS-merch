-- Add image_scale column to tables for storing image size configuration
ALTER TABLE public.tables 
ADD COLUMN image_scale DECIMAL DEFAULT 1.0;

-- Update the column to be NOT NULL with a default value
ALTER TABLE public.tables 
ALTER COLUMN image_scale SET NOT NULL;