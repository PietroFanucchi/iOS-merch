-- Allow public access to stores for price tag pages
CREATE POLICY "Public can view stores for price tags" 
ON public.stores 
FOR SELECT 
USING (true);

-- Allow public access to launches for price tag pages  
CREATE POLICY "Public can view launches for price tags"
ON public.launches 
FOR SELECT 
USING (true);

-- Allow public access to launch dates for price tag pages
CREATE POLICY "Public can view launch dates for price tags"
ON public.launch_dates 
FOR SELECT 
USING (true);

-- Allow public access to chain price tags for downloads
CREATE POLICY "Public can view chain price tags for downloads"
ON public.chain_price_tags 
FOR SELECT 
USING (true);