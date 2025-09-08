-- Create training_sessions table for tactician training sessions
CREATE TABLE public.training_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tactician_id UUID NOT NULL REFERENCES public.tacticians(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME WITHOUT TIME ZONE NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for training sessions
CREATE POLICY "Training sessions are viewable by everyone" 
ON public.training_sessions 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can create training sessions" 
ON public.training_sessions 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Only admins can update training sessions" 
ON public.training_sessions 
FOR UPDATE 
USING (is_admin());

CREATE POLICY "Only admins can delete training sessions" 
ON public.training_sessions 
FOR DELETE 
USING (is_admin());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_training_sessions_updated_at
BEFORE UPDATE ON public.training_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add constraint for notes max length
ALTER TABLE public.training_sessions 
ADD CONSTRAINT training_sessions_notes_length 
CHECK (length(notes) <= 100);