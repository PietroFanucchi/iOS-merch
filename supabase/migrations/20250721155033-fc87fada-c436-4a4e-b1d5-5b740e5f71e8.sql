-- Create tables table for managing restaurant tables
CREATE TABLE public.tables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  table_type TEXT NOT NULL CHECK (table_type IN ('singolo', 'doppio_back_to_back', 'doppio_free_standing')),
  devices JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

-- Create policies for tables access
CREATE POLICY "Tables are viewable by everyone" 
ON public.tables 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can create tables" 
ON public.tables 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Only admins can update tables" 
ON public.tables 
FOR UPDATE 
USING (is_admin());

CREATE POLICY "Only admins can delete tables" 
ON public.tables 
FOR DELETE 
USING (is_admin());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_tables_updated_at
BEFORE UPDATE ON public.tables
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();