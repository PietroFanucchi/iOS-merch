-- Aggiungi campi contatti alla tabella stores
ALTER TABLE public.stores ADD COLUMN phone_technical text;
ALTER TABLE public.stores ADD COLUMN phone_informatics text;
ALTER TABLE public.stores ADD COLUMN director_email text;

-- Crea tabella per gestire gli status/problemi dello store
CREATE TABLE public.store_issues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  issue_type text NOT NULL, -- es: 'missing_device', 'alarm_malfunction', 'other'
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'resolved'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS per store_issues
ALTER TABLE public.store_issues ENABLE ROW LEVEL SECURITY;

-- Policies per store_issues
CREATE POLICY "Store issues are viewable by everyone" 
ON public.store_issues 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can create store issues" 
ON public.store_issues 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Only admins can update store issues" 
ON public.store_issues 
FOR UPDATE 
USING (is_admin());

CREATE POLICY "Only admins can delete store issues" 
ON public.store_issues 
FOR DELETE 
USING (is_admin());

-- Trigger per updated_at su store_issues
CREATE TRIGGER update_store_issues_updated_at
BEFORE UPDATE ON public.store_issues
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();