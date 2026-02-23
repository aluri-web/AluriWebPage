-- =============================================================
-- Migración: Campos Acumulados para Sistema de Causación
-- Fecha: 2026-02-23
-- Descripción: Agrega campos para tracking de intereses acumulados
--              en inversiones y última causación en créditos
-- =============================================================

-- 1. Campos en tabla inversiones
-- Interés acumulado atribuido al inversionista (suma de causaciones diarias)
ALTER TABLE public.inversiones
ADD COLUMN IF NOT EXISTS interes_acumulado NUMERIC(15,2) DEFAULT 0;

-- Mora acumulada atribuida al inversionista
ALTER TABLE public.inversiones
ADD COLUMN IF NOT EXISTS mora_acumulada NUMERIC(15,2) DEFAULT 0;

-- Fecha de última causación procesada para esta inversión
ALTER TABLE public.inversiones
ADD COLUMN IF NOT EXISTS ultima_causacion DATE;

-- 2. Campos en tabla créditos
-- Fecha de última causación procesada para este crédito
ALTER TABLE public.creditos
ADD COLUMN IF NOT EXISTS ultima_causacion DATE;

-- Días de mora actual (snapshot para consultas rápidas)
ALTER TABLE public.creditos
ADD COLUMN IF NOT EXISTS dias_mora_actual INTEGER DEFAULT 0;

-- Interés acumulado total del crédito (suma de todas las causaciones)
ALTER TABLE public.creditos
ADD COLUMN IF NOT EXISTS interes_acumulado_total NUMERIC(15,2) DEFAULT 0;

-- 3. Índices para consultas de causación pendiente
CREATE INDEX IF NOT EXISTS idx_creditos_ultima_causacion ON public.creditos(ultima_causacion);
CREATE INDEX IF NOT EXISTS idx_inversiones_ultima_causacion ON public.inversiones(ultima_causacion);

-- 4. Comentarios
COMMENT ON COLUMN public.inversiones.interes_acumulado IS 'Suma histórica de intereses causados para esta inversión';
COMMENT ON COLUMN public.inversiones.mora_acumulada IS 'Suma histórica de mora causada para esta inversión';
COMMENT ON COLUMN public.inversiones.ultima_causacion IS 'Fecha de la última causación diaria procesada';

COMMENT ON COLUMN public.creditos.ultima_causacion IS 'Fecha de la última causación diaria procesada';
COMMENT ON COLUMN public.creditos.dias_mora_actual IS 'Días de mora al momento de la última causación';
COMMENT ON COLUMN public.creditos.interes_acumulado_total IS 'Suma histórica de todos los intereses causados';
