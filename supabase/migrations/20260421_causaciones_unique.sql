-- =============================================================
-- Migración: Prevenir causaciones duplicadas
-- Fecha: 2026-04-21
-- Descripción: Agrega UNIQUE constraint sobre (credito_id,
--              fecha_causacion) para evitar que llamadas paralelas
--              al cron creen filas duplicadas para el mismo día.
-- =============================================================

-- Borrar duplicados existentes, manteniendo solo la fila más reciente por
-- (credito_id, fecha_causacion) — asumiendo que la más nueva es la correcta.
DELETE FROM public.causaciones_inversionistas
WHERE causacion_id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY credito_id, fecha_causacion
             ORDER BY created_at DESC NULLS LAST, id DESC
           ) AS rn
    FROM public.causaciones_diarias
  ) ranked
  WHERE rn > 1
);

DELETE FROM public.causaciones_diarias
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY credito_id, fecha_causacion
             ORDER BY created_at DESC NULLS LAST, id DESC
           ) AS rn
    FROM public.causaciones_diarias
  ) ranked
  WHERE rn > 1
);

-- Ahora que no hay duplicados, agregar la constraint.
ALTER TABLE public.causaciones_diarias
  ADD CONSTRAINT causaciones_diarias_credito_fecha_unique
  UNIQUE (credito_id, fecha_causacion);
