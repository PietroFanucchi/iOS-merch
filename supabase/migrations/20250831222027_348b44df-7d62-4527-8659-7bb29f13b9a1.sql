-- Allow public access to launch_devices for price tag pages
CREATE POLICY "Public can view launch devices for price tags"
ON public.launch_devices 
FOR SELECT 
USING (true);

-- Allow public access to devices for price tag pages
CREATE POLICY "Public can view devices for price tags"
ON public.devices 
FOR SELECT 
USING (true);