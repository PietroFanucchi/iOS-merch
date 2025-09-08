-- Pulisci il database eliminando tutti i training cancellati
-- Con la nuova logica questi non servono più perché vengono eliminati direttamente
DELETE FROM public.training_sessions 
WHERE status = 'cancelled';