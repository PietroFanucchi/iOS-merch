-- Create email_reasons table
CREATE TABLE public.email_reasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_reasons ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view email reasons" 
ON public.email_reasons 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can create email reasons" 
ON public.email_reasons 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Only admins can update email reasons" 
ON public.email_reasons 
FOR UPDATE 
USING (is_admin());

CREATE POLICY "Only admins can delete email reasons" 
ON public.email_reasons 
FOR DELETE 
USING (is_admin());

-- Create trigger for updated_at
CREATE TRIGGER update_email_reasons_updated_at
BEFORE UPDATE ON public.email_reasons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default reasons including the new third one
INSERT INTO public.email_reasons (name, description) VALUES
('Invio dati lancio', 'Comunicazione dei dati relativi al lancio di prodotti'),
('Invio cartelli prezzo', 'Invio dei cartelli prezzo per i prodotti'),
('Data Installazione, nominativo tattico e cartelli prezzo', 'Comunicazione completa con data installazione, nominativo tattico e cartelli prezzo');

-- Add motivo_invio column to email_templates
ALTER TABLE public.email_templates 
ADD COLUMN motivo_invio UUID REFERENCES public.email_reasons(id);

-- Create index for better performance
CREATE INDEX idx_email_templates_motivo_invio ON public.email_templates(motivo_invio);