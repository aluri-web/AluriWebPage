-- =============================================================
-- Migración: Desactivar cron SQL de calcular_mora_diaria
-- Fecha: 2026-03-24
-- Razón: Unificar en el sistema TypeScript (Vercel cron) que
--        crea causaciones_diarias, transacciones y distribuye
--        a inversionistas. El pg_cron SQL solo actualizaba saldos
--        sin audit trail completo.
-- =============================================================

-- 1. Desactivar el job de pg_cron
SELECT cron.unschedule('calcula-mora-diaria');

-- 2. Reemplazar la función con un no-op que deja registro
CREATE OR REPLACE FUNCTION public.calcular_mora_diaria()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- DESACTIVADA: La causación diaria ahora se ejecuta desde Vercel cron
  -- (POST /api/cron/calcular-intereses) que crea causaciones_diarias,
  -- transacciones y distribuye a inversionistas.
  INSERT INTO public.log_ejecucion_cron (fecha, nombre_job, resultado, detalle)
  VALUES (
    (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::DATE,
    'calcula_mora_diaria',
    'skipped',
    'Función desactivada. Causación se ejecuta desde Vercel cron.'
  );
END;
$$;
