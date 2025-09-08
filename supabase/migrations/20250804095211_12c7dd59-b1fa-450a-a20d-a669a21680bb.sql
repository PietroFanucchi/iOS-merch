-- Create table for storing chain logos
CREATE TABLE public.chain_logos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chain TEXT NOT NULL UNIQUE,
  logo_url TEXT NOT NULL,
  logo_filename TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.chain_logos ENABLE ROW LEVEL SECURITY;

-- Create policies for chain logos
CREATE POLICY "Chain logos are viewable by everyone" 
ON public.chain_logos 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can create chain logos" 
ON public.chain_logos 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Only admins can update chain logos" 
ON public.chain_logos 
FOR UPDATE 
USING (is_admin());

CREATE POLICY "Only admins can delete chain logos" 
ON public.chain_logos 
FOR DELETE 
USING (is_admin());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_chain_logos_updated_at
BEFORE UPDATE ON public.chain_logos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for chain logos
INSERT INTO storage.buckets (id, name, public) VALUES ('chain-logos', 'chain-logos', true);

-- Create storage policies for chain logos
CREATE POLICY "Chain logos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'chain-logos');

CREATE POLICY "Only admins can upload chain logos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'chain-logos' AND is_admin());

CREATE POLICY "Only admins can update chain logos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'chain-logos' AND is_admin());

CREATE POLICY "Only admins can delete chain logos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'chain-logos' AND is_admin());