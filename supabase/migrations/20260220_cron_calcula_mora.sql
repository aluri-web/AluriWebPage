-- =============================================================
-- Migración: Cron Job de Cálculo de Mora Diario
-- Fecha: 2026-02-20
-- Requiere: pg_cron habilitado desde Supabase Dashboard
--           (Database → Extensions → pg_cron → Enable)
-- =============================================================

-- 1. Tabla de log de ejecuciones del cron (auditoría permanente)
CREATE TABLE IF NOT EXISTS public.log_ejecucion_cron (
  id BIGSERIAL PRIMARY KEY,
  fecha DATE NOT NULL,
  nombre_job VARCHAR(50) NOT NULL,
  creditos_procesados INTEGER DEFAULT 0,
  creditos_en_mora INTEGER DEFAULT 0,
  resultado VARCHAR(20) CHECK (resultado IN ('exito', 'error')),
  detalle TEXT,
  ejecutado_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_log_cron_fecha ON public.log_ejecucion_cron(fecha);
CREATE INDEX IF NOT EXISTS idx_log_cron_job ON public.log_ejecucion_cron(nombre_job);

-- 2. Función: calcular_mora_diaria()
--
-- IDEMPOTENTE: Recalcula saldo_mora desde cero cada ejecución.
--              Ejecutar 2+ veces en el mismo día produce el mismo resultado
--              en creditos (solo agrega filas adicionales en log).
--
-- ZONA HORARIA: Usa America/Bogota para evitar cobros anticipados
--               de mora cuando el servidor está en UTC.
--
CREATE OR REPLACE FUNCTION public.calcular_mora_diaria()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r RECORD;
  v_dia_pago INTEGER;
  v_proximo_vencimiento DATE;
  v_dias_mora INTEGER;
  v_saldo_mora NUMERIC(15,2);
  v_tasa_mora NUMERIC(5,2);
  v_hoy DATE;
  v_procesados INTEGER := 0;
  v_en_mora INTEGER := 0;
BEGIN
  -- Fecha de hoy en zona horaria Colombia
  v_hoy := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::DATE;

  FOR r IN
    SELECT id, fecha_desembolso, fecha_ultimo_pago, saldo_capital, tasa_mora
    FROM public.creditos
    WHERE estado_credito != 'pagado'
      AND saldo_capital > 0
      AND fecha_ultimo_pago IS NOT NULL
      AND fecha_desembolso IS NOT NULL
  LOOP
    v_procesados := v_procesados + 1;

    -- Día de pago mensual = día del desembolso original
    v_dia_pago := EXTRACT(DAY FROM r.fecha_desembolso);

    -- Próximo vencimiento = fecha_ultimo_pago + 1 mes, ajustado al día de pago
    -- Se usa LEAST para manejar meses con menos días (ej: feb 28 cuando dia_pago = 31)
    v_proximo_vencimiento := (r.fecha_ultimo_pago + INTERVAL '1 month');
    v_proximo_vencimiento := make_date(
      EXTRACT(YEAR FROM v_proximo_vencimiento)::INT,
      EXTRACT(MONTH FROM v_proximo_vencimiento)::INT,
      LEAST(
        v_dia_pago,
        EXTRACT(DAY FROM
          (date_trunc('month', v_proximo_vencimiento) + INTERVAL '1 month - 1 day')
        )::INT
      )
    );

    v_tasa_mora := COALESCE(r.tasa_mora, 2.07);

    IF v_hoy > v_proximo_vencimiento THEN
      -- EN MORA: calcular días e interés de mora
      v_dias_mora := v_hoy - v_proximo_vencimiento;
      v_saldo_mora := ROUND(r.saldo_capital * (v_tasa_mora / 100.0) / 30.0 * v_dias_mora, 0);
      v_en_mora := v_en_mora + 1;

      UPDATE public.creditos
      SET en_mora = true, saldo_mora = v_saldo_mora
      WHERE id = r.id;
    ELSE
      -- NO en mora (o salió de mora por pago reciente)
      UPDATE public.creditos
      SET en_mora = false, saldo_mora = 0
      WHERE id = r.id;
    END IF;
  END LOOP;

  -- Log de auditoría
  INSERT INTO public.log_ejecucion_cron (fecha, nombre_job, creditos_procesados, creditos_en_mora, resultado)
  VALUES (v_hoy, 'calcula_mora_diaria', v_procesados, v_en_mora, 'exito');

EXCEPTION WHEN OTHERS THEN
  -- Log del error (no se pierde el detalle)
  INSERT INTO public.log_ejecucion_cron (fecha, nombre_job, resultado, detalle)
  VALUES (
    (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::DATE,
    'calcula_mora_diaria',
    'error',
    SQLERRM
  );
  RAISE;
END;
$$;

-- 3. Programar cron job: todos los días a medianoche hora Colombia (5:00 AM UTC)
SELECT cron.schedule(
  'calcula-mora-diaria',
  '0 5 * * *',
  $$SELECT public.calcular_mora_diaria()$$
);
