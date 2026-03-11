-- =============================================================
-- Migración: Corregir cálculo de intereses y mora
--
-- REGLAS VERIFICADAS CON EXCEL SFC:
-- 0. La causación empieza el día DESPUÉS del desembolso
-- 1. Interés Corriente: Capital del día ACTUAL × Tasa Diaria
-- 2. Interés Moratorio: Capital del día ANTERIOR × Tasa Mora Diaria
-- 3. Tasa Diaria = (1 + Tasa_EA/100)^(1/365) - 1
-- 4. Solo el interés corriente se capitaliza (agrega al capital)
-- 5. La mora se acumula por separado, NO se capitaliza
-- 6. PRECISIÓN: Usar NUMERIC(20,10) para cálculos intermedios (igual que Excel)
--    Solo redondear al guardar valores finales en DB (ROUND(..., 0) para pesos)
--
-- Fecha: 2026-03-11
-- =============================================================

-- 1. Agregar columna saldo_base_anterior a causaciones_diarias
ALTER TABLE public.causaciones_diarias
ADD COLUMN IF NOT EXISTS saldo_base_anterior NUMERIC(15,2);

COMMENT ON COLUMN public.causaciones_diarias.saldo_base_anterior IS 'Capital del día anterior, usado para calcular mora';

-- 2. Agregar columna tasa_mora_diaria a causaciones_diarias
ALTER TABLE public.causaciones_diarias
ADD COLUMN IF NOT EXISTS tasa_mora_diaria NUMERIC(12,10);

COMMENT ON COLUMN public.causaciones_diarias.tasa_mora_diaria IS 'Tasa diaria de mora (usura SFC) usada ese día';

-- 3. Agregar columna saldo_capital_anterior a creditos
ALTER TABLE public.creditos
ADD COLUMN IF NOT EXISTS saldo_capital_anterior NUMERIC(15,2);

COMMENT ON COLUMN public.creditos.saldo_capital_anterior IS 'Capital del día anterior, para cálculo de mora';

-- 4. Actualizar función calcular_mora_diaria() con la lógica correcta
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
  v_saldo_mora NUMERIC(20,10);          -- Alta precisión para cálculos
  v_base_mora NUMERIC(20,10);
  v_capital_anterior NUMERIC(20,10);
  v_mora_date DATE;
  v_tasa_mora_diaria NUMERIC(20,15);    -- 15 decimales como Excel
  v_mora_flag BOOLEAN;
  -- Intereses
  v_tasa_diaria NUMERIC(20,15);         -- 15 decimales como Excel
  v_interes_diario NUMERIC(20,10);      -- Alta precisión para cálculos
  v_nuevo_capital NUMERIC(20,10);
BEGIN
  v_hoy := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::DATE;

  FOR r IN
    SELECT id, fecha_desembolso, fecha_ultimo_pago, saldo_capital,
           saldo_capital_anterior, tasa_nominal, estado_credito
    FROM public.creditos
    WHERE estado_credito != 'pagado'
      AND saldo_capital > 0
      AND fecha_desembolso IS NOT NULL
      AND fecha_desembolso < v_hoy  -- Solo créditos desembolsados ANTES de hoy (causación empieza día después)
  LOOP
    v_procesados := v_procesados + 1;

    -- =====================
    -- CÁLCULO DE INTERÉS CORRIENTE
    -- Fórmula: (1 + tasa_ea/100)^(1/365) - 1
    -- Se calcula sobre el capital ACTUAL
    -- PRECISIÓN: Mantener todos los decimales durante el cálculo
    -- =====================
    v_tasa_diaria := POWER(1.0 + (COALESCE(r.tasa_nominal, 0) / 100.0), 1.0 / 365.0) - 1.0;
    -- NO redondear aquí - mantener precisión completa
    v_interes_diario := r.saldo_capital * v_tasa_diaria;

    -- Capital anterior para mora (si no existe, usar capital actual)
    v_capital_anterior := COALESCE(r.saldo_capital_anterior, r.saldo_capital);

    -- =====================
    -- CÁLCULO DE MORA
    -- Se calcula sobre el capital del día ANTERIOR
    -- Tasa de usura SFC vigente
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

      IF v_hoy > v_proximo_vencimiento THEN
        -- Obtener tasa de mora del día anterior
        v_tasa_mora_diaria := public.calcular_tasa_mora_diaria(v_hoy - 1);

        -- Mora sobre capital ANTERIOR (no actual)
        -- Solo un día de mora a la vez (el del día anterior)
        -- NO redondear aquí - mantener precisión completa
        v_saldo_mora := v_capital_anterior * v_tasa_mora_diaria;
        v_mora_flag := true;
        v_en_mora := v_en_mora + 1;
      END IF;
    END IF;

    -- =====================
    -- ACTUALIZAR CAPITAL
    -- Nuevo capital = capital actual + interés corriente (redondeado)
    -- (solo corriente se capitaliza, mora NO)
    -- REDONDEAR AQUÍ para guardar en DB (pesos colombianos sin centavos)
    -- =====================
    v_nuevo_capital := r.saldo_capital + ROUND(v_interes_diario, 0);

    -- =====================
    -- UPDATE CRÉDITO (valores redondeados para DB)
    -- =====================
    UPDATE public.creditos
    SET saldo_capital = v_nuevo_capital,
        saldo_capital_anterior = r.saldo_capital,
        saldo_intereses = COALESCE(saldo_intereses, 0) + ROUND(v_interes_diario, 0),
        en_mora = v_mora_flag,
        saldo_mora = COALESCE(saldo_mora, 0) + ROUND(v_saldo_mora, 0)
    WHERE id = r.id;

    -- Insertar causación diaria (tasas con precisión completa, montos redondeados)
    INSERT INTO public.causaciones_diarias (
      credito_id,
      fecha_causacion,
      saldo_base,
      saldo_base_anterior,
      tasa_nominal,
      tasa_diaria,
      tasa_mora_diaria,
      interes_causado,
      mora_causada,
      dias_mora
    ) VALUES (
      r.id,
      v_hoy,
      r.saldo_capital,
      v_capital_anterior,
      r.tasa_nominal,
      v_tasa_diaria,              -- Mantener precisión completa de la tasa
      v_tasa_mora_diaria,         -- Mantener precisión completa de la tasa
      ROUND(v_interes_diario, 0), -- Redondear para pesos
      ROUND(v_saldo_mora, 0),     -- Redondear para pesos
      CASE WHEN v_mora_flag THEN (v_hoy - v_proximo_vencimiento) ELSE 0 END
    )
    ON CONFLICT (credito_id, fecha_causacion) DO UPDATE SET
      saldo_base = EXCLUDED.saldo_base,
      saldo_base_anterior = EXCLUDED.saldo_base_anterior,
      tasa_diaria = EXCLUDED.tasa_diaria,
      tasa_mora_diaria = EXCLUDED.tasa_mora_diaria,
      interes_causado = EXCLUDED.interes_causado,
      mora_causada = EXCLUDED.mora_causada,
      dias_mora = EXCLUDED.dias_mora;

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

COMMENT ON FUNCTION public.calcular_mora_diaria IS 'Calcula intereses diarios (corriente sobre capital actual, mora sobre capital anterior) usando tasas base 365 días y tasa de usura SFC. La causación empieza el día DESPUÉS del desembolso.';

-- 5. Inicializar saldo_capital_anterior para créditos existentes
UPDATE public.creditos
SET saldo_capital_anterior = saldo_capital
WHERE saldo_capital_anterior IS NULL
  AND saldo_capital > 0;

-- 6. Agregar comentarios de documentación
COMMENT ON TABLE public.causaciones_diarias IS 'Registro diario de causación de intereses. saldo_base = capital actual (para corriente), saldo_base_anterior = capital día anterior (para mora)';
