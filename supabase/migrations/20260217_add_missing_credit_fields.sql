-- =============================================
-- Migración: Campos faltantes en creditos
-- (tasa EA, comisión, co-deudor, datos del inmueble)
-- Fecha: 2026-02-17
-- =============================================

-- Tasa de interés efectiva anual (calculada)
ALTER TABLE public.creditos
ADD COLUMN IF NOT EXISTS tasa_interes_ea NUMERIC(5,2);

-- Comisión del deudor y porcentaje Aluri
ALTER TABLE public.creditos
ADD COLUMN IF NOT EXISTS comision_deudor NUMERIC(15,2) DEFAULT 0;

ALTER TABLE public.creditos
ADD COLUMN IF NOT EXISTS comision_aluri_pct NUMERIC(5,2) DEFAULT 0;

-- Co-deudor
ALTER TABLE public.creditos
ADD COLUMN IF NOT EXISTS co_deudor_id UUID REFERENCES public.profiles(id);

-- Datos del inmueble
ALTER TABLE public.creditos
ADD COLUMN IF NOT EXISTS direccion_inmueble VARCHAR(300);

ALTER TABLE public.creditos
ADD COLUMN IF NOT EXISTS ciudad_inmueble VARCHAR(100);

ALTER TABLE public.creditos
ADD COLUMN IF NOT EXISTS tipo_inmueble VARCHAR(50);

ALTER TABLE public.creditos
ADD COLUMN IF NOT EXISTS fotos_inmueble JSONB DEFAULT '[]'::jsonb;
