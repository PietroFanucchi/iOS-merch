-- Create table for imported store boxes that are pending programming
CREATE TABLE public.pending_store_visits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  visit_type text NOT NULL CHECK (visit_type IN ('white', 'tier2')),
  imported_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.pending_store_visits ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Pending store visits are viewable by everyone" 
ON public.pending_store_visits 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage pending store visits" 
ON public.pending_store_visits 
FOR ALL 
USING (is_admin());

-- Add trigger for updated_at
CREATE TRIGGER update_pending_store_visits_updated_at
BEFORE UPDATE ON public.pending_store_visits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();