-- Aggiorna le policy RLS per permettere agli utenti autenticati di modificare le configurazioni dei tavoli
DROP POLICY IF EXISTS "Only admins can update tables" ON public.tables;

-- Nuova policy che permette a tutti gli utenti autenticati di aggiornare i tavoli
CREATE POLICY "Authenticated users can update table configurations" 
ON public.tables 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);