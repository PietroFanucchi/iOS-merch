-- Add new fields to stores table for digital price tags and promotional banners
ALTER TABLE public.stores 
ADD COLUMN has_digital_price_tags BOOLEAN DEFAULT NULL,
ADD COLUMN has_promotional_banners TEXT DEFAULT NULL;