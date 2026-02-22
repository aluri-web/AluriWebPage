-- Add documentos_inmueble column for storing document URLs per credit
ALTER TABLE public.creditos
ADD COLUMN IF NOT EXISTS documentos_inmueble JSONB DEFAULT '[]'::jsonb;
