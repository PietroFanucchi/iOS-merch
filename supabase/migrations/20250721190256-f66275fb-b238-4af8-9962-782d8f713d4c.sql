-- Create storage bucket for price tags PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('price-tags', 'price-tags', true);

-- Create policies for price tag PDFs
CREATE POLICY "Price tag PDFs are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'price-tags');

CREATE POLICY "Only admins can upload price tag PDFs" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'price-tags' AND is_admin());

CREATE POLICY "Only admins can update price tag PDFs" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'price-tags' AND is_admin());

CREATE POLICY "Only admins can delete price tag PDFs" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'price-tags' AND is_admin());