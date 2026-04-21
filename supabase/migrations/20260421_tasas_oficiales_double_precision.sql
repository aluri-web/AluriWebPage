-- =============================================================
-- Migración: Aumentar precisión de tasa_ea en tasas_oficiales
-- Fecha: 2026-04-21
-- Descripción: Cambia la columna tasa_ea de NUMERIC(5,2) a
--              DOUBLE PRECISION para evitar redondeos automáticos
--              cuando una tasa se publique con más de 2 decimales.
-- =============================================================

ALTER TABLE public.tasas_oficiales
ALTER COLUMN tasa_ea TYPE DOUBLE PRECISION;

COMMENT ON COLUMN public.tasas_oficiales.tasa_ea
  IS 'Tasa efectiva anual — DOUBLE PRECISION (15 dígitos, sin redondeo)';
