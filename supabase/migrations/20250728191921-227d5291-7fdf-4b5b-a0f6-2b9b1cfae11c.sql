-- Create RPC functions for tacticians management
CREATE OR REPLACE FUNCTION get_tacticians()
RETURNS TABLE (
  id UUID,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id, name, created_at 
  FROM public.tacticians 
  ORDER BY name;
$$;

CREATE OR REPLACE FUNCTION create_tactician(name TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  INSERT INTO public.tacticians (name)
  VALUES (name)
  RETURNING id, name, created_at;
$$;

CREATE OR REPLACE FUNCTION delete_tactician(tactician_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM public.tacticians WHERE id = tactician_id;
$$;

-- Add notes column to launch_stores
ALTER TABLE public.launch_stores 
ADD COLUMN IF NOT EXISTS notes TEXT;