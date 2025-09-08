-- Add 'test' to the table_type check constraint
ALTER TABLE public.tables 
DROP CONSTRAINT IF EXISTS tables_table_type_check;

ALTER TABLE public.tables 
ADD CONSTRAINT tables_table_type_check 
CHECK (table_type IN ('singolo', 'doppio_back_to_back', 'doppio_free_standing', 'test'));