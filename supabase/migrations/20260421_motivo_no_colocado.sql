-- =============================================================
-- Migración: Guardar motivo y fecha cuando un crédito pasa a
-- estado 'no_colocado' para analítica de causas de cancelación.
-- Fecha: 2026-04-21
-- =============================================================

ALTER TABLE public.creditos
  ADD COLUMN IF NOT EXISTS motivo_no_colocado TEXT,
  ADD COLUMN IF NOT EXISTS motivo_no_colocado_detalle TEXT,
  ADD COLUMN IF NOT EXISTS fecha_no_colocado TIMESTAMPTZ;

COMMENT ON COLUMN public.creditos.motivo_no_colocado IS 'Razón por la que el crédito no se colocó (categoría)';
COMMENT ON COLUMN public.creditos.motivo_no_colocado_detalle IS 'Detalle o comentario adicional sobre el motivo (opcional)';
COMMENT ON COLUMN public.creditos.fecha_no_colocado IS 'Timestamp en que se marcó el crédito como no_colocado';
