-- Create tacticians table
CREATE TABLE public.tacticians (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tacticians ENABLE ROW LEVEL SECURITY;

-- Create policies for tacticians
CREATE POLICY "Tacticians are viewable by everyone" 
ON public.tacticians 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can create tacticians" 
ON public.tacticians 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Only admins can update tacticians" 
ON public.tacticians 
FOR UPDATE 
USING (is_admin());

CREATE POLICY "Only admins can delete tacticians" 
ON public.tacticians 
FOR DELETE 
USING (is_admin());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_tacticians_updated_at
BEFORE UPDATE ON public.tacticians
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update launch_stores table to align with interface
ALTER TABLE public.launch_stores 
ADD COLUMN IF NOT EXISTS date_communicated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tactician_id UUID REFERENCES public.tacticians(id);

-- Update status values to match interface
UPDATE public.launch_stores 
SET status = CASE 
  WHEN status = 'pending' THEN 'da_effettuare'
  WHEN status = 'completed' THEN 'completata'
  ELSE status
END;