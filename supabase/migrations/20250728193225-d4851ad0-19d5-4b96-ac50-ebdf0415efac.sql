-- Create table for launch dates
CREATE TABLE public.launch_dates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  launch_id UUID NOT NULL REFERENCES public.launches(id) ON DELETE CASCADE,
  launch_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(launch_id, launch_date)
);

-- Enable Row Level Security
ALTER TABLE public.launch_dates ENABLE ROW LEVEL SECURITY;

-- Create policies for launch_dates
CREATE POLICY "Launch dates are viewable by everyone" 
ON public.launch_dates 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage launch dates" 
ON public.launch_dates 
FOR ALL 
USING (is_admin());