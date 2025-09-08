-- Create activities table
CREATE TABLE public.activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create activity_stores junction table
CREATE TABLE public.activity_stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(activity_id, store_id)
);

-- Enable RLS
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_stores ENABLE ROW LEVEL SECURITY;

-- RLS policies for activities
CREATE POLICY "Activities are viewable by everyone" 
ON public.activities 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can create activities" 
ON public.activities 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Only admins can update activities" 
ON public.activities 
FOR UPDATE 
USING (is_admin());

CREATE POLICY "Only admins can delete activities" 
ON public.activities 
FOR DELETE 
USING (is_admin());

-- RLS policies for activity_stores
CREATE POLICY "Activity stores are viewable by everyone" 
ON public.activity_stores 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage activity stores" 
ON public.activity_stores 
FOR ALL 
USING (is_admin());

-- Add trigger for updated_at
CREATE TRIGGER update_activities_updated_at
BEFORE UPDATE ON public.activities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();