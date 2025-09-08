-- Create table for launch devices (products impacted by the launch)
CREATE TABLE public.launch_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  launch_id UUID NOT NULL,
  device_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.launch_devices ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Launch devices are viewable by everyone" 
ON public.launch_devices 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage launch devices" 
ON public.launch_devices 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Create indexes for better performance
CREATE INDEX idx_launch_devices_launch_id ON public.launch_devices(launch_id);
CREATE INDEX idx_launch_devices_device_id ON public.launch_devices(device_id);

-- Create unique constraint to prevent duplicate associations
CREATE UNIQUE INDEX idx_launch_devices_unique ON public.launch_devices(launch_id, device_id);