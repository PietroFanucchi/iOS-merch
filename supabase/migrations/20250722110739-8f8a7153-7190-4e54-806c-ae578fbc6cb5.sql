-- Create visits table for store visit scheduling
CREATE TABLE public.visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  visit_type TEXT NOT NULL CHECK (visit_type IN ('white', 'tier2')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Visits are viewable by everyone" 
ON public.visits 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can create visits" 
ON public.visits 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Only admins can update visits" 
ON public.visits 
FOR UPDATE 
USING (is_admin());

CREATE POLICY "Only admins can delete visits" 
ON public.visits 
FOR DELETE 
USING (is_admin());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_visits_updated_at
BEFORE UPDATE ON public.visits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_visits_scheduled_date ON public.visits(scheduled_date);
CREATE INDEX idx_visits_store_id ON public.visits(store_id);
CREATE INDEX idx_visits_status ON public.visits(status);