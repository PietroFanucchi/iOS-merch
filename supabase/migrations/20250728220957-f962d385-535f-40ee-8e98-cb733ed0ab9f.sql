-- Aggiungi campi per email multiple di telefonia e informatica
ALTER TABLE public.stores 
ADD COLUMN email_technical TEXT[], 
ADD COLUMN email_informatics TEXT[];

-- Migra i dati esistenti se presenti (assumo che i campi email esistenti fossero nei telefoni)
-- Nota: non ci sono campi email esistenti per telefonia/informatica, quindi iniziamo con array vuoti