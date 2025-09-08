-- Create function to update tables count for a store
CREATE OR REPLACE FUNCTION public.update_store_tables_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the tables_count for the affected store(s)
  IF TG_OP = 'INSERT' THEN
    UPDATE public.stores 
    SET tables_count = (
      SELECT COUNT(*) 
      FROM public.store_tables 
      WHERE store_id = NEW.store_id
    )
    WHERE id = NEW.store_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.stores 
    SET tables_count = (
      SELECT COUNT(*) 
      FROM public.store_tables 
      WHERE store_id = OLD.store_id
    )
    WHERE id = OLD.store_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT operations
CREATE TRIGGER update_store_tables_count_insert
  AFTER INSERT ON public.store_tables
  FOR EACH ROW
  EXECUTE FUNCTION public.update_store_tables_count();

-- Create trigger for DELETE operations  
CREATE TRIGGER update_store_tables_count_delete
  AFTER DELETE ON public.store_tables
  FOR EACH ROW
  EXECUTE FUNCTION public.update_store_tables_count();

-- Update existing stores with correct table counts
UPDATE public.stores 
SET tables_count = (
  SELECT COUNT(*) 
  FROM public.store_tables 
  WHERE store_id = stores.id
);