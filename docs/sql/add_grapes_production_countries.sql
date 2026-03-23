-- Run in Supabase SQL editor (or migrate) before using the CMS field.
-- Stores JSON array of English country names, e.g. ["France", "United States", "Chile"]

ALTER TABLE public.grapes
ADD COLUMN IF NOT EXISTS production_countries jsonb DEFAULT NULL;

COMMENT ON COLUMN public.grapes.production_countries IS 'JSON array of English country names (sorted on save), optional';
