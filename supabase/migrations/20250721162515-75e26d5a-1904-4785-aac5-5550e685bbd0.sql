-- Create enum for device categories
CREATE TYPE public.device_category AS ENUM ('Accessori', 'iPhone', 'Watch', 'Mac', 'iPad');

-- Create devices table
CREATE TABLE public.devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category public.device_category NOT NULL,
  model TEXT,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- Create policies for devices
CREATE POLICY "Devices are viewable by everyone" 
ON public.devices 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can create devices" 
ON public.devices 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Only admins can update devices" 
ON public.devices 
FOR UPDATE 
USING (is_admin());

CREATE POLICY "Only admins can delete devices" 
ON public.devices 
FOR DELETE 
USING (is_admin());

-- Add trigger for timestamps
CREATE TRIGGER update_devices_updated_at
BEFORE UPDATE ON public.devices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();