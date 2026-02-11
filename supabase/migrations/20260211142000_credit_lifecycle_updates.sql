-- Add new state values to check constraint
-- We need to drop the old check constraint and add a new one because we are modifying the allowed values
ALTER TABLE public.creditos DROP CONSTRAINT creditos_estado_check;

ALTER TABLE public.creditos ADD CONSTRAINT creditos_estado_check 
CHECK (estado IN ('solicitado', 'aprobado', 'publicado', 'en_firma', 'firmado', 'activo', 'finalizado', 'castigado', 'mora', 'anulado'));

-- Add new timestamp columns
ALTER TABLE public.creditos ADD COLUMN IF NOT EXISTS fecha_firma_programada TIMESTAMP WITH TIME ZONE;
-- fecha_desembolso already exists, but ensure it's TIMESTAMP WITH TIME ZONE (it is in original schema)
