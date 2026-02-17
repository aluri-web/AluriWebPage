-- =============================================
-- Migración: Tipo de liquidación, notaría y valor comercial
-- Fecha: 2026-02-17
-- =============================================

-- 1. Tipo de liquidación (anticipada o vencida)
ALTER TABLE public.creditos
ADD COLUMN IF NOT EXISTS tipo_liquidacion VARCHAR(20) DEFAULT 'vencida'
  CHECK (tipo_liquidacion IN ('anticipada', 'vencida'));

-- 2. Datos de notaría (se llenan durante el flujo de vida, etapa en_firma)
ALTER TABLE public.creditos
ADD COLUMN IF NOT EXISTS notaria VARCHAR(200);

ALTER TABLE public.creditos
ADD COLUMN IF NOT EXISTS costos_notaria NUMERIC(15,2) DEFAULT 0;

-- 3. Valor comercial del inmueble (para cálculo de LTV y riesgo)
ALTER TABLE public.creditos
ADD COLUMN IF NOT EXISTS valor_comercial NUMERIC(15,2);
