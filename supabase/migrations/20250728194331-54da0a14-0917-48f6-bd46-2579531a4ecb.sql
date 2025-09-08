-- Create table for price tag device associations
CREATE TABLE public.price_tag_device_associations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id UUID NOT NULL,
  price_tag_name TEXT NOT NULL,
  device_id TEXT NOT NULL, -- ID del dispositivo nel JSON del tavolo
  device_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.price_tag_device_associations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Price tag associations are viewable by everyone" 
ON public.price_tag_device_associations 
FOR SELECT 
USING (true);

CREATE POLICY "Only authenticated users can manage price tag associations" 
ON public.price_tag_device_associations 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_price_tag_device_associations_updated_at
BEFORE UPDATE ON public.price_tag_device_associations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_price_tag_associations_table_id ON public.price_tag_device_associations(table_id);
CREATE INDEX idx_price_tag_associations_device_id ON public.price_tag_device_associations(device_id);