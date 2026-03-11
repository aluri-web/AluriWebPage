-- =============================================================
-- Migración: Implementar lógica Excel con dos capitales
--
-- NUEVAS REGLAS DE CÁLCULO (verificadas con Excel SFC):
-- 1. DOS CAPITALES PARALELOS:
--    - capital_esperado: Capital si pagos a tiempo (base para Int. Corriente)
--    - capital_real: Capital acumulado (saldo_capital existente)
--
-- 2. Int. Corriente = Capital ESPERADO × Tasa Diaria
-- 3. Int. Moratorio Potencial = Capital ESPERADO × Tasa Mora (SIEMPRE)
-- 4. Int. Moratorio = Solo se cobra cuando en_mora = true
-- 5. monto_para_colocarse = Capital Real - Capital Esperado
--
-- Fecha: 2026-03-11
-- =============================================================

-- =====================================================
-- 1. AGREGAR COLUMNAS A TABLA CREDITOS
-- =====================================================

-- Capital esperado (si pagos a tiempo)
ALTER TABLE public.creditos
ADD COLUMN IF NOT EXISTS saldo_capital_esperado NUMERIC(15,2);

COMMENT ON COLUMN public.creditos.saldo_capital_esperado IS 'Capital si pagos se hicieran a tiempo (base para Int. Corriente)';

-- Fecha del próximo pago esperado
ALTER TABLE public.creditos
ADD COLUMN IF NOT EXISTS fecha_proximo_pago DATE;

COMMENT ON COLUMN public.creditos.fecha_proximo_pago IS 'Próxima fecha de pago esperada';

-- Monto de pago mensual esperado
ALTER TABLE public.creditos
ADD COLUMN IF NOT EXISTS monto_pago_esperado NUMERIC(15,2);

COMMENT ON COLUMN public.creditos.monto_pago_esperado IS 'Monto del pago mensual esperado';

-- Estado de mora (booleano)
ALTER TABLE public.creditos
ADD COLUMN IF NOT EXISTS en_mora BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.creditos.en_mora IS 'Si el crédito está actualmente en mora';

-- =====================================================
-- 2. AGREGAR COLUMNAS A TABLA CAUSACIONES_DIARIAS
-- =====================================================

-- Capital esperado del día
ALTER TABLE public.causaciones_diarias
ADD COLUMN IF NOT EXISTS capital_esperado NUMERIC(15,2);

COMMENT ON COLUMN public.causaciones_diarias.capital_esperado IS 'Capital esperado (base para Int. Corriente)';

-- Capital real del día
ALTER TABLE public.causaciones_diarias
ADD COLUMN IF NOT EXISTS capital_real NUMERIC(15,2);

COMMENT ON COLUMN public.causaciones_diarias.capital_real IS 'Capital real acumulado';

-- Int. Moratorio potencial (siempre calculado)
ALTER TABLE public.causaciones_diarias
ADD COLUMN IF NOT EXISTS interes_moratorio_potencial NUMERIC(15,2) DEFAULT 0;

COMMENT ON COLUMN public.causaciones_diarias.interes_moratorio_potencial IS 'Int. Moratorio potencial (siempre se calcula)';

-- Estado de mora del día
ALTER TABLE public.causaciones_diarias
ADD COLUMN IF NOT EXISTS en_mora BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.causaciones_diarias.en_mora IS 'Si estaba en mora este día';

-- Monto para colocarse al día
ALTER TABLE public.causaciones_diarias
ADD COLUMN IF NOT EXISTS monto_para_colocarse NUMERIC(15,2) DEFAULT 0;

COMMENT ON COLUMN public.causaciones_diarias.monto_para_colocarse IS 'Capital Real - Capital Esperado';

-- =====================================================
-- 3. INICIALIZAR VALORES PARA CRÉDITOS EXISTENTES
-- =====================================================

-- Establecer capital_esperado = saldo_capital para créditos existentes
UPDATE public.creditos
SET saldo_capital_esperado = saldo_capital
WHERE saldo_capital_esperado IS NULL
  AND saldo_capital > 0;

-- Calcular monto_pago_esperado basado en tasa y capital (interés mensual aproximado)
-- Fórmula: monto = capital * ((1 + tasa/100)^(30/365) - 1)
UPDATE public.creditos
SET monto_pago_esperado = ROUND(
  saldo_capital * (POWER(1 + tasa_nominal / 100.0, 30.0 / 365.0) - 1),
  0
)
WHERE monto_pago_esperado IS NULL
  AND saldo_capital > 0
  AND tasa_nominal > 0;

-- Establecer fecha_proximo_pago (día del desembolso del próximo mes)
UPDATE public.creditos
SET fecha_proximo_pago = (
  SELECT make_date(
    EXTRACT(YEAR FROM CURRENT_DATE + INTERVAL '1 month')::INT,
    EXTRACT(MONTH FROM CURRENT_DATE + INTERVAL '1 month')::INT,
    LEAST(
      EXTRACT(DAY FROM fecha_desembolso)::INT,
      EXTRACT(DAY FROM (date_trunc('month', CURRENT_DATE + INTERVAL '2 months') - INTERVAL '1 day'))::INT
    )
  )
)
WHERE fecha_proximo_pago IS NULL
  AND fecha_desembolso IS NOT NULL;

-- =====================================================
-- 4. ACTUALIZAR CAUSACIONES EXISTENTES
-- =====================================================

-- Migrar datos de saldo_base a capital_esperado y capital_real
UPDATE public.causaciones_diarias
SET capital_esperado = COALESCE(saldo_base, 0),
    capital_real = COALESCE(saldo_base, 0),
    interes_moratorio_potencial = COALESCE(mora_causada, 0),
    en_mora = (dias_mora > 0),
    monto_para_colocarse = 0
WHERE capital_esperado IS NULL;

-- =====================================================
-- 5. DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE public.causaciones_diarias IS
'Registro diario de causación de intereses (Lógica Excel).
capital_esperado = base para Int. Corriente
capital_real = capital acumulado
interes_moratorio_potencial = mora calculada siempre (potencial)
monto_para_colocarse = diferencia Real - Esperado';

COMMENT ON TABLE public.creditos IS
'Créditos con dos capitales paralelos (Lógica Excel).
saldo_capital = Capital REAL (acumulado)
saldo_capital_esperado = Capital ESPERADO (si pagos a tiempo)';
