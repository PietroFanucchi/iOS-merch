-- Create table for product launches
CREATE TABLE public.launches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'in_progress', 'completed', 'cancelled')),
  launch_date DATE,
  created_by UUID REFERENCES auth.users(id)
);

-- Create table for launch table assignments
CREATE TABLE public.launch_tables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  launch_id UUID NOT NULL REFERENCES public.launches(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(launch_id, table_id)
);

-- Create table for launch store assignments (derived from launch_tables)
CREATE TABLE public.launch_stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  launch_id UUID NOT NULL REFERENCES public.launches(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  visit_date DATE,
  technician_name TEXT,
  visit_time TIME,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(launch_id, store_id)
);

-- Enable RLS
ALTER TABLE public.launches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.launch_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.launch_stores ENABLE ROW LEVEL SECURITY;

-- Create policies for launches
CREATE POLICY "Launches are viewable by everyone" 
ON public.launches 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can create launches" 
ON public.launches 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Only admins can update launches" 
ON public.launches 
FOR UPDATE 
USING (is_admin());

CREATE POLICY "Only admins can delete launches" 
ON public.launches 
FOR DELETE 
USING (is_admin());

-- Create policies for launch_tables
CREATE POLICY "Launch tables are viewable by everyone" 
ON public.launch_tables 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage launch table assignments" 
ON public.launch_tables 
FOR ALL 
USING (is_admin());

-- Create policies for launch_stores
CREATE POLICY "Launch stores are viewable by everyone" 
ON public.launch_stores 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage launch store assignments" 
ON public.launch_stores 
FOR ALL 
USING (is_admin());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_launches_updated_at
BEFORE UPDATE ON public.launches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_launch_stores_updated_at
BEFORE UPDATE ON public.launch_stores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();