-- =============================================================
-- Migración: Actualizar Cron para calcular saldo_intereses
-- Usa tipo_liquidacion (anticipada/vencida) y tipo_amortizacion
-- (solo_interes/francesa) para determinar intereses pendientes.
-- Fecha: 2026-02-23
-- =============================================================

-- 1. Función helper: meses de interés debidos
--    Replica la lógica de monthsOfInterestDue() de migracion_pagos.ts
--    anticipada = TRUE  → intereses cobrados al inicio del periodo
--    anticipada = FALSE → intereses cobrados al final (vencida)
CREATE OR REPLACE FUNCTION public.months_of_interest_due(
  base_date DATE,
  target_date DATE,
  anticipada BOOLEAN
)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  periods INTEGER;
BEGIN
  periods := (EXTRACT(YEAR FROM target_date) - EXTRACT(YEAR FROM base_date))::INT * 12
           + (EXTRACT(MONTH FROM target_date) - EXTRACT(MONTH FROM base_date))::INT;

  IF EXTRACT(DAY FROM target_date) >= EXTRACT(DAY FROM base_date) THEN
    periods := periods + 1;
  END IF;

  IF NOT anticipada THEN
    periods := periods - 1;
  END IF;

  RETURN GREATEST(0, periods);
END;
$$;

-- 2. Reemplazar función calcular_mora_diaria()
--    Ahora también calcula saldo_intereses
CREATE OR REPLACE FUNCTION public.calcular_mora_diaria()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r RECORD;
  v_hoy DATE;
  v_procesados INTEGER := 0;
  v_en_mora INTEGER := 0;
  -- Mora
  v_dia_pago INTEGER;
  v_proximo_vencimiento DATE;
  v_dias_mora INTEGER;
  v_saldo_mora NUMERIC(15,2);
  v_tasa_mora NUMERIC(5,2);
  v_mora_flag BOOLEAN;
  -- Intereses
  v_es_anticipada BOOLEAN;
  v_es_solo_interes BOOLEAN;
  v_tasa_nominal NUMERIC(5,2);
  v_principal NUMERIC(15,2);
  v_months_due INTEGER;
  v_total_interest_due NUMERIC(15,2);
  v_total_interest_paid NUMERIC(15,2);
  v_saldo_intereses NUMERIC(15,2);
  v_last_interest_date DATE;
  v_base_date DATE;
BEGIN
  v_hoy := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::DATE;

  FOR r IN
    SELECT id, fecha_desembolso, fecha_ultimo_pago, saldo_capital,
           tasa_mora, tasa_nominal, tipo_liquidacion, tipo_amortizacion,
           valor_colocado, monto_solicitado
    FROM public.creditos
    WHERE estado_credito != 'pagado'
      AND saldo_capital > 0
      AND fecha_desembolso IS NOT NULL
  LOOP
    v_procesados := v_procesados + 1;

    -- =====================
    -- CÁLCULO DE INTERESES
    -- =====================
    v_tasa_nominal := COALESCE(r.tasa_nominal, 0);
    v_es_anticipada := (COALESCE(r.tipo_liquidacion, 'vencida') = 'anticipada');
    v_es_solo_interes := (COALESCE(r.tipo_amortizacion, 'francesa') = 'solo_interes');
    v_principal := COALESCE(r.valor_colocado, r.monto_solicitado);

    IF v_tasa_nominal > 0 THEN
      IF v_es_solo_interes THEN
        -- SOLO INTERES: desde desembolso, resta lo ya pagado
        v_months_due := public.months_of_interest_due(
          r.fecha_desembolso::DATE, v_hoy, v_es_anticipada
        );
        v_total_interest_due := v_months_due * (v_principal * v_tasa_nominal / 100.0);

        SELECT COALESCE(SUM(monto), 0) INTO v_total_interest_paid
        FROM public.transacciones
        WHERE credito_id = r.id AND tipo_transaccion = 'pago_interes';

        v_saldo_intereses := GREATEST(0, ROUND(v_total_interest_due - v_total_interest_paid, 0));
      ELSE
        -- FRANCESA: desde último pago de interés (o desembolso)
        SELECT MAX(fecha_transaccion)::DATE INTO v_last_interest_date
        FROM public.transacciones
        WHERE credito_id = r.id AND tipo_transaccion = 'pago_interes';

        v_base_date := COALESCE(v_last_interest_date, r.fecha_desembolso::DATE);

        v_months_due := public.months_of_interest_due(
          v_base_date, v_hoy, v_es_anticipada
        );
        v_saldo_intereses := ROUND(
          v_months_due * (r.saldo_capital * v_tasa_nominal / 100.0), 0
        );
      END IF;
    ELSE
      v_saldo_intereses := 0;
    END IF;

    -- =====================
    -- CÁLCULO DE MORA
    -- =====================
    v_mora_flag := false;
    v_saldo_mora := 0;

    IF r.fecha_ultimo_pago IS NOT NULL THEN
      v_dia_pago := EXTRACT(DAY FROM r.fecha_desembolso);

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
        v_dias_mora := v_hoy - v_proximo_vencimiento;
        v_saldo_mora := ROUND(r.saldo_capital * (v_tasa_mora / 100.0) / 30.0 * v_dias_mora, 0);
        v_mora_flag := true;
        v_en_mora := v_en_mora + 1;
      END IF;
    END IF;

    -- =====================
    -- UPDATE CRÉDITO
    -- =====================
    UPDATE public.creditos
    SET saldo_intereses = v_saldo_intereses,
        en_mora = v_mora_flag,
        saldo_mora = v_saldo_mora
    WHERE id = r.id;

  END LOOP;

  -- Log de auditoría
  INSERT INTO public.log_ejecucion_cron (fecha, nombre_job, creditos_procesados, creditos_en_mora, resultado)
  VALUES (v_hoy, 'calcula_mora_diaria', v_procesados, v_en_mora, 'exito');

EXCEPTION WHEN OTHERS THEN
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
