-- Create table for chain price tags
CREATE TABLE public.chain_price_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chain TEXT NOT NULL,
  name TEXT NOT NULL,
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(chain, name)
);

-- Enable RLS
ALTER TABLE public.chain_price_tags ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Chain price tags are viewable by everyone" 
ON public.chain_price_tags 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can create chain price tags" 
ON public.chain_price_tags 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Only admins can update chain price tags" 
ON public.chain_price_tags 
FOR UPDATE 
USING (is_admin());

CREATE POLICY "Only admins can delete chain price tags" 
ON public.chain_price_tags 
FOR DELETE 
USING (is_admin());

-- Add trigger for timestamps
CREATE TRIGGER update_chain_price_tags_updated_at
BEFORE UPDATE ON public.chain_price_tags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();