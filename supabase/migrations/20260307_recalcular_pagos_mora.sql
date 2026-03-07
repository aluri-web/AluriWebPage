-- =============================================================
-- Recalcular TODOS los pagos con la nueva fórmula de mora:
-- Interés compuesto diario, base = capital + intereses,
-- tasa de usura SFC por periodo.
--
-- Para cada crédito con pagos:
-- 1. Replay los pagos en orden cronológico
-- 2. Recalcular mora con fórmula compuesta
-- 3. Redistribuir cascada: mora → intereses → capital
-- 4. Actualizar transacciones y saldos del crédito
-- =============================================================

DO $$
DECLARE
  cr RECORD;
  pg RECORD;

  -- Credit params
  v_principal NUMERIC;
  v_tasa_nominal NUMERIC;
  v_es_anticipada BOOLEAN;
  v_es_solo_interes BOOLEAN;
  v_fecha_desembolso DATE;
  v_dia_pago INTEGER;
  v_plazo INTEGER;

  -- Running state (acumulado entre pagos)
  v_saldo_capital NUMERIC;
  v_total_interest_paid NUMERIC;      -- solo_interes: acumula interés pagado
  v_last_interest_pmt_date DATE;      -- francesa: fecha último pago de interés
  v_fecha_ultimo_pago DATE;           -- para cálculo de próximo vencimiento

  -- Calculated per payment
  v_saldo_intereses NUMERIC;
  v_saldo_mora NUMERIC;
  v_months_due INTEGER;
  v_total_interest_due NUMERIC;
  v_base_date DATE;
  v_proximo_vencimiento DATE;
  v_base_mora NUMERIC;
  v_mora_date DATE;
  v_tasa_diaria NUMERIC;

  -- Payment cascade
  v_pago_total NUMERIC;
  v_restante NUMERIC;
  v_nuevo_mora NUMERIC;
  v_nuevo_interes NUMERIC;
  v_nuevo_capital NUMERIC;

  v_creditos INT := 0;
  v_ajustes INT := 0;
BEGIN
  RAISE NOTICE '=== Iniciando recálculo de pagos con mora compuesta ===';

  FOR cr IN
    SELECT c.id, c.codigo_credito, c.fecha_desembolso,
           COALESCE(c.valor_colocado, c.monto_solicitado) as principal,
           COALESCE(c.tasa_nominal, 0) as tasa_nominal,
           COALESCE(c.tipo_liquidacion, 'vencida') as tipo_liquidacion,
           COALESCE(c.tipo_amortizacion, 'francesa') as tipo_amortizacion,
           COALESCE(c.plazo, 12) as plazo
    FROM creditos c
    WHERE c.fecha_desembolso IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM transacciones t
        WHERE t.credito_id = c.id
          AND t.tipo_transaccion IN ('pago_capital', 'pago_interes', 'pago_mora')
      )
    ORDER BY c.codigo_credito
  LOOP
    v_creditos := v_creditos + 1;
    v_principal := cr.principal;
    v_tasa_nominal := cr.tasa_nominal;
    v_es_anticipada := (cr.tipo_liquidacion = 'anticipada');
    v_es_solo_interes := (cr.tipo_amortizacion = 'solo_interes');
    v_fecha_desembolso := cr.fecha_desembolso::DATE;
    v_dia_pago := EXTRACT(DAY FROM v_fecha_desembolso);
    v_plazo := cr.plazo;

    -- Estado inicial del crédito
    v_saldo_capital := v_principal;
    v_total_interest_paid := 0;
    v_last_interest_pmt_date := NULL;
    v_fecha_ultimo_pago := NULL;

    RAISE NOTICE 'Crédito %: capital=%, tasa=%, tipo=%',
      cr.codigo_credito, v_principal, v_tasa_nominal, cr.tipo_amortizacion;

    -- Procesar cada grupo de pago en orden cronológico
    FOR pg IN
      SELECT referencia_pago,
             MIN(fecha_aplicacion)::DATE as fecha_pago,
             SUM(monto) as total,
             SUM(CASE WHEN tipo_transaccion = 'pago_mora' THEN monto ELSE 0 END) as old_mora,
             SUM(CASE WHEN tipo_transaccion = 'pago_interes' THEN monto ELSE 0 END) as old_interes,
             SUM(CASE WHEN tipo_transaccion = 'pago_capital' THEN monto ELSE 0 END) as old_capital
      FROM transacciones
      WHERE credito_id = cr.id
        AND tipo_transaccion IN ('pago_capital', 'pago_interes', 'pago_mora')
      GROUP BY referencia_pago
      ORDER BY MIN(fecha_aplicacion), MIN(created_at)
    LOOP
      v_pago_total := pg.total;

      -- ========================================
      -- CÁLCULO DE INTERESES a la fecha del pago
      -- ========================================
      IF v_tasa_nominal > 0 THEN
        IF v_es_solo_interes THEN
          -- Total intereses debidos desde desembolso hasta este pago
          v_months_due := public.months_of_interest_due(
            v_fecha_desembolso, pg.fecha_pago, v_es_anticipada
          );
          v_total_interest_due := v_months_due * (v_principal * v_tasa_nominal / 100.0);
          v_saldo_intereses := GREATEST(0, ROUND(v_total_interest_due - v_total_interest_paid, 0));
        ELSE
          -- Francesa: desde último pago de interés (o desembolso)
          v_base_date := COALESCE(v_last_interest_pmt_date, v_fecha_desembolso);
          v_months_due := public.months_of_interest_due(
            v_base_date, pg.fecha_pago, v_es_anticipada
          );
          v_saldo_intereses := ROUND(v_months_due * (v_saldo_capital * v_tasa_nominal / 100.0), 0);
        END IF;
      ELSE
        v_saldo_intereses := 0;
      END IF;

      -- ========================================
      -- CÁLCULO DE MORA (compuesto diario)
      -- Base = capital + intereses, tasa SFC por periodo
      -- ========================================
      v_saldo_mora := 0;

      IF v_fecha_ultimo_pago IS NOT NULL THEN
        v_proximo_vencimiento := (v_fecha_ultimo_pago + INTERVAL '1 month')::DATE;
        v_proximo_vencimiento := make_date(
          EXTRACT(YEAR FROM v_proximo_vencimiento)::INT,
          EXTRACT(MONTH FROM v_proximo_vencimiento)::INT,
          LEAST(
            v_dia_pago,
            EXTRACT(DAY FROM
              (date_trunc('month', v_proximo_vencimiento::TIMESTAMP) + INTERVAL '1 month - 1 day')
            )::INT
          )
        );

        IF pg.fecha_pago > v_proximo_vencimiento THEN
          v_base_mora := v_saldo_capital + v_saldo_intereses;
          v_saldo_mora := 0;
          v_mora_date := v_proximo_vencimiento;

          WHILE v_mora_date < pg.fecha_pago LOOP
            v_tasa_diaria := public.calcular_tasa_mora_diaria(v_mora_date);
            v_saldo_mora := v_saldo_mora + (v_base_mora + v_saldo_mora) * v_tasa_diaria;
            v_mora_date := v_mora_date + 1;
          END LOOP;

          v_saldo_mora := ROUND(v_saldo_mora, 0);
        END IF;
      END IF;

      -- ========================================
      -- CASCADA: mora → intereses → capital
      -- ========================================
      v_restante := v_pago_total;

      v_nuevo_mora := LEAST(v_restante, v_saldo_mora);
      v_restante := v_restante - v_nuevo_mora;

      v_nuevo_interes := LEAST(v_restante, v_saldo_intereses);
      v_restante := v_restante - v_nuevo_interes;

      v_nuevo_capital := LEAST(v_restante, v_saldo_capital);

      -- ========================================
      -- ACTUALIZAR SI CAMBIÓ LA DISTRIBUCIÓN
      -- ========================================
      IF v_nuevo_mora != pg.old_mora
        OR v_nuevo_interes != pg.old_interes
        OR v_nuevo_capital != pg.old_capital
      THEN
        v_ajustes := v_ajustes + 1;

        RAISE NOTICE '  % pago %: mora $% → $%, int $% → $%, cap $% → $%',
          cr.codigo_credito, pg.fecha_pago,
          pg.old_mora, v_nuevo_mora,
          pg.old_interes, v_nuevo_interes,
          pg.old_capital, v_nuevo_capital;

        -- Eliminar transacciones viejas de este grupo
        DELETE FROM transacciones
        WHERE credito_id = cr.id
          AND referencia_pago = pg.referencia_pago
          AND tipo_transaccion IN ('pago_capital', 'pago_interes', 'pago_mora');

        -- Insertar nuevas con la distribución corregida
        IF v_nuevo_mora > 0 THEN
          INSERT INTO transacciones (credito_id, tipo_transaccion, monto, fecha_aplicacion, fecha_transaccion, referencia_pago)
          VALUES (cr.id, 'pago_mora', v_nuevo_mora, pg.fecha_pago, pg.fecha_pago, pg.referencia_pago);
        END IF;

        IF v_nuevo_interes > 0 THEN
          INSERT INTO transacciones (credito_id, tipo_transaccion, monto, fecha_aplicacion, fecha_transaccion, referencia_pago)
          VALUES (cr.id, 'pago_interes', v_nuevo_interes, pg.fecha_pago, pg.fecha_pago, pg.referencia_pago);
        END IF;

        IF v_nuevo_capital > 0 THEN
          INSERT INTO transacciones (credito_id, tipo_transaccion, monto, fecha_aplicacion, fecha_transaccion, referencia_pago)
          VALUES (cr.id, 'pago_capital', v_nuevo_capital, pg.fecha_pago, pg.fecha_pago, pg.referencia_pago);
        END IF;
      END IF;

      -- ========================================
      -- ACTUALIZAR ESTADO PARA SIGUIENTE PAGO
      -- ========================================
      v_saldo_capital := v_saldo_capital - v_nuevo_capital;
      v_total_interest_paid := v_total_interest_paid + v_nuevo_interes;
      IF v_nuevo_interes > 0 THEN
        v_last_interest_pmt_date := pg.fecha_pago;
      END IF;
      v_fecha_ultimo_pago := pg.fecha_pago;

    END LOOP;

    -- Actualizar saldos del crédito con el estado final
    UPDATE creditos
    SET saldo_capital = v_saldo_capital,
        fecha_ultimo_pago = v_fecha_ultimo_pago
    WHERE id = cr.id;

  END LOOP;

  -- Recalcular intereses y mora actuales con el cron
  PERFORM public.calcular_mora_diaria();

  RAISE NOTICE '=== Completado: % créditos procesados, % pagos ajustados ===', v_creditos, v_ajustes;
END $$;
