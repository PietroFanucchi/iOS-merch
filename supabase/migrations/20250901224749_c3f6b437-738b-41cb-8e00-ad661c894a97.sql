-- Create storage bucket for table images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('table-images', 'table-images', true);

-- Add image_url and slots columns to tables table
ALTER TABLE public.tables 
ADD COLUMN IF NOT EXISTS image_url text,
ADD COLUMN IF NOT EXISTS slots jsonb DEFAULT '[]'::jsonb;

-- Create storage policies for table images
CREATE POLICY "Authenticated users can view table images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'table-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can upload table images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'table-images' AND is_admin());

CREATE POLICY "Only admins can update table images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'table-images' AND is_admin());

CREATE POLICY "Only admins can delete table images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'table-images' AND is_admin());