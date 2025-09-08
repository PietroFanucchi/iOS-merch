-- Modify tables structure to be global templates
ALTER TABLE public.tables DROP COLUMN store_id;

-- Create junction table for store-table assignments
CREATE TABLE public.store_tables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(store_id, table_id)
);

-- Enable RLS on junction table
ALTER TABLE public.store_tables ENABLE ROW LEVEL SECURITY;

-- Create policies for store_tables
CREATE POLICY "Store tables are viewable by everyone" 
ON public.store_tables 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage store table assignments" 
ON public.store_tables 
FOR ALL 
USING (is_admin());