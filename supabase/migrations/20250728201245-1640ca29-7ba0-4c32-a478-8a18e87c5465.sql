-- Create email templates table
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  store_category TEXT NOT NULL CHECK (store_category IN ('White', 'Tier2')),
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Email templates are viewable by everyone" 
ON public.email_templates 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can create email templates" 
ON public.email_templates 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Only admins can update email templates" 
ON public.email_templates 
FOR UPDATE 
USING (is_admin());

CREATE POLICY "Only admins can delete email templates" 
ON public.email_templates 
FOR DELETE 
USING (is_admin());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();