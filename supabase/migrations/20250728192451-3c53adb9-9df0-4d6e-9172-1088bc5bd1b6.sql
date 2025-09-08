-- Fix the status constraint to accept the new status values
ALTER TABLE public.launch_stores 
DROP CONSTRAINT IF EXISTS launch_stores_status_check;

-- Add new constraint with correct status values
ALTER TABLE public.launch_stores 
ADD CONSTRAINT launch_stores_status_check 
CHECK (status IN ('da_effettuare', 'completata', 'effettuata_non_completata', 'pending'));