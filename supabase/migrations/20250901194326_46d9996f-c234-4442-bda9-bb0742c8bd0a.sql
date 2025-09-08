-- Update email reasons with correct names
UPDATE public.email_reasons 
SET name = 'Cartelli prezzo'
WHERE name = 'Invio cartelli prezzo';

UPDATE public.email_reasons 
SET name = 'Data installazione e nominativo tattico'
WHERE name = 'Invio dati lancio';

-- The third one is already correct: "Data Installazione, nominativo tattico e cartelli prezzo"