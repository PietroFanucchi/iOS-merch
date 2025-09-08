-- Remove motivo_invio column from email_templates table
DROP INDEX IF EXISTS idx_email_templates_motivo_invio;
ALTER TABLE public.email_templates DROP COLUMN IF EXISTS motivo_invio;