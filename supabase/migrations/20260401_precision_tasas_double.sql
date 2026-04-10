-- =============================================================
-- Migración: Aumentar precisión de tasas a DOUBLE PRECISION
-- Fecha: 2026-04-01
-- Descripción: Cambia columnas de tasas diarias de NUMERIC(10,8)
--              a DOUBLE PRECISION para igualar la precisión de
--              Excel/Google Sheets (IEEE 754, 15 dígitos significativos).
-- =============================================================

-- 1. Columna tasa_diaria: NUMERIC(10,8) → DOUBLE PRECISION
ALTER TABLE public.causaciones_diarias
ALTER COLUMN tasa_diaria TYPE DOUBLE PRECISION;

-- 2. Columna tasa_mora_diaria: NUMERIC(10,8) → DOUBLE PRECISION
ALTER TABLE public.causaciones_diarias
ALTER COLUMN tasa_mora_diaria TYPE DOUBLE PRECISION;

-- 3. Actualizar comentarios
COMMENT ON COLUMN public.causaciones_diarias.tasa_diaria
  IS 'Tasa diaria efectiva corriente — DOUBLE PRECISION (15 dígitos, igual que Excel)';

COMMENT ON COLUMN public.causaciones_diarias.tasa_mora_diaria
  IS 'Tasa diaria de mora (usura SFC) — DOUBLE PRECISION (15 dígitos, igual que Excel)';

-- 4. Actualizar función helper para retornar DOUBLE PRECISION
CREATE OR REPLACE FUNCTION public.calcular_tasa_diaria(tasa_nominal NUMERIC)
RETURNS DOUBLE PRECISION
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN POWER(1 + (tasa_nominal / 100.0), 1.0 / 365.0) - 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.calcular_tasa_mora_diaria(p_fecha DATE DEFAULT CURRENT_DATE)
RETURNS DOUBLE PRECISION
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_tasa_usura NUMERIC;
  v_tasa_diaria DOUBLE PRECISION;
BEGIN
  -- Buscar tasa de usura vigente para la fecha
  SELECT tasa_ea INTO v_tasa_usura
  FROM public.tasas_oficiales
  WHERE tipo = 'usura_consumo'
    AND vigencia_desde <= p_fecha
    AND vigencia_hasta >= p_fecha
  ORDER BY vigencia_desde DESC
  LIMIT 1;

  -- Fallback: última tasa conocida
  IF v_tasa_usura IS NULL THEN
    SELECT tasa_ea INTO v_tasa_usura
    FROM public.tasas_oficiales
    WHERE tipo = 'usura_consumo'
    ORDER BY vigencia_desde DESC
    LIMIT 1;
  END IF;

  -- Fallback final
  IF v_tasa_usura IS NULL THEN
    v_tasa_usura := 25.52;
  END IF;

  v_tasa_diaria := POWER(1 + (v_tasa_usura / 100.0), 1.0 / 365.0) - 1;

  RETURN v_tasa_diaria;
END;
$$;
