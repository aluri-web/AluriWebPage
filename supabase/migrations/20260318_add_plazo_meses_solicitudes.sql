-- =============================================================
-- Migracion: Agregar columna plazo_meses a solicitudes_credito
-- Fecha: 2026-03-18
-- =============================================================

ALTER TABLE public.solicitudes_credito
  ADD COLUMN IF NOT EXISTS plazo_meses INTEGER;
