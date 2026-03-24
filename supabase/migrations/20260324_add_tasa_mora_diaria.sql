-- =============================================================
-- Migración: Agregar columna tasa_mora_diaria a causaciones_diarias
-- Fecha: 2026-03-24
-- Razón: El calculator TypeScript guarda la tasa diaria de mora
--        (usura SFC) pero la columna no existía en la tabla.
-- =============================================================

ALTER TABLE public.causaciones_diarias
ADD COLUMN IF NOT EXISTS tasa_mora_diaria NUMERIC(10,8) DEFAULT 0;

COMMENT ON COLUMN public.causaciones_diarias.tasa_mora_diaria IS 'Tasa diaria de mora (usura SFC)';
