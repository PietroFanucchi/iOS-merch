-- Update RLS policies to ensure users can view but only admins can modify

-- Update stores policies to ensure authenticated users can view
DROP POLICY IF EXISTS "Authenticated users can view stores" ON public.stores;
CREATE POLICY "Authenticated users can view stores" 
ON public.stores 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Update launches policies to ensure authenticated users can view  
DROP POLICY IF EXISTS "Launches are viewable by everyone" ON public.launches;
CREATE POLICY "Authenticated users can view launches" 
ON public.launches 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Update devices policies to ensure authenticated users can view
DROP POLICY IF EXISTS "Devices are viewable by everyone" ON public.devices;
CREATE POLICY "Authenticated users can view devices" 
ON public.devices 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Update tables policies to ensure authenticated users can view
DROP POLICY IF EXISTS "Tables are viewable by everyone" ON public.tables;
CREATE POLICY "Authenticated users can view tables" 
ON public.tables 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Update store_issues policies to ensure authenticated users can view
DROP POLICY IF EXISTS "Store issues are viewable by everyone" ON public.store_issues;
CREATE POLICY "Authenticated users can view store issues" 
ON public.store_issues 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Update email_templates policies to ensure authenticated users can view
DROP POLICY IF EXISTS "Email templates are viewable by everyone" ON public.email_templates;
CREATE POLICY "Authenticated users can view email templates" 
ON public.email_templates 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Update chain_price_tags policies to ensure authenticated users can view
DROP POLICY IF EXISTS "Chain price tags are viewable by everyone" ON public.chain_price_tags;
CREATE POLICY "Authenticated users can view chain price tags" 
ON public.chain_price_tags 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Update tacticians policies to ensure authenticated users can view
DROP POLICY IF EXISTS "Tacticians are viewable by everyone" ON public.tacticians;
CREATE POLICY "Authenticated users can view tacticians" 
ON public.tacticians 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Update visits policies to ensure authenticated users can view
DROP POLICY IF EXISTS "Visits are viewable by everyone" ON public.visits;
CREATE POLICY "Authenticated users can view visits" 
ON public.visits 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Update activities policies to ensure authenticated users can view
DROP POLICY IF EXISTS "Activities are viewable by everyone" ON public.activities;
CREATE POLICY "Authenticated users can view activities" 
ON public.activities 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Update all junction tables to allow authenticated users to view
DROP POLICY IF EXISTS "Launch devices are viewable by everyone" ON public.launch_devices;
CREATE POLICY "Authenticated users can view launch devices" 
ON public.launch_devices 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Launch stores are viewable by everyone" ON public.launch_stores;
CREATE POLICY "Authenticated users can view launch stores" 
ON public.launch_stores 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Launch tables are viewable by everyone" ON public.launch_tables;
CREATE POLICY "Authenticated users can view launch tables" 
ON public.launch_tables 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Launch dates are viewable by everyone" ON public.launch_dates;
CREATE POLICY "Authenticated users can view launch dates" 
ON public.launch_dates 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Store tables are viewable by everyone" ON public.store_tables;
CREATE POLICY "Authenticated users can view store tables" 
ON public.store_tables 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Activity stores are viewable by everyone" ON public.activity_stores;
CREATE POLICY "Authenticated users can view activity stores" 
ON public.activity_stores 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Price tag associations are viewable by everyone" ON public.price_tag_device_associations;
CREATE POLICY "Authenticated users can view price tag associations" 
ON public.price_tag_device_associations 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Pending store visits are viewable by everyone" ON public.pending_store_visits;
CREATE POLICY "Authenticated users can view pending store visits" 
ON public.pending_store_visits 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Training sessions are viewable by everyone" ON public.training_sessions;
CREATE POLICY "Authenticated users can view training sessions" 
ON public.training_sessions 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Chain logos are viewable by everyone" ON public.chain_logos;
CREATE POLICY "Authenticated users can view chain logos" 
ON public.chain_logos 
FOR SELECT 
USING (auth.uid() IS NOT NULL);