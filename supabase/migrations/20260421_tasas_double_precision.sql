-- =============================================================
-- Migración: Aumentar precisión de tasas y porcentajes a DOUBLE PRECISION
-- Fecha: 2026-04-21
-- Descripción: Cambia columnas de tasas de interés y porcentajes de
--              participación de NUMERIC(5,2) a DOUBLE PRECISION para
--              evitar pérdida de precisión (ej: 1.875% truncado a 1.88%).
--              Mantiene columnas de dinero en NUMERIC(15,2) porque
--              usamos redondeo al peso y NUMERIC preserva exactitud en SUM().
-- =============================================================

-- 1. Drop la vista que depende de porcentaje_participacion
DROP VIEW IF EXISTS public.resumen_causaciones_mensual;

-- 2. Tasas del crédito (fuente de toda la precisión)
ALTER TABLE public.creditos ALTER COLUMN tasa_nominal TYPE DOUBLE PRECISION;
ALTER TABLE public.creditos ALTER COLUMN tasa_interes_ea TYPE DOUBLE PRECISION;
ALTER TABLE public.creditos ALTER COLUMN tasa_mora TYPE DOUBLE PRECISION;

-- 3. Tasa replicada en causación diaria
ALTER TABLE public.causaciones_diarias ALTER COLUMN tasa_nominal TYPE DOUBLE PRECISION;

-- 4. Tasas usadas en cálculo / liquidación
ALTER TABLE public.inversiones ALTER COLUMN interest_rate_investor TYPE DOUBLE PRECISION;
ALTER TABLE public.liquidaciones_mensuales ALTER COLUMN tasa_aplicada TYPE DOUBLE PRECISION;
ALTER TABLE public.evaluaciones_ia ALTER COLUMN interest_rate TYPE DOUBLE PRECISION;

-- 5. Porcentajes de participación (evita 3×33.33 = 99.99 → pierde $)
ALTER TABLE public.inversiones ALTER COLUMN porcentaje_participacion TYPE DOUBLE PRECISION;
ALTER TABLE public.causaciones_inversionistas ALTER COLUMN porcentaje_participacion TYPE DOUBLE PRECISION;

-- 6. Recrear la vista con el nuevo tipo
CREATE OR REPLACE VIEW public.resumen_causaciones_mensual AS
SELECT ci.inversionista_id,
    ci.credito_id,
    date_trunc('month'::text, ci.fecha_causacion::timestamp with time zone)::date AS mes,
    c.codigo_credito,
    p.full_name AS nombre_inversionista,
    ci.porcentaje_participacion,
    count(*) AS dias_causados,
    sum(ci.interes_atribuido) AS interes_mes,
    sum(ci.mora_atribuida) AS mora_mes,
    sum(ci.interes_atribuido + ci.mora_atribuida) AS total_mes
   FROM causaciones_inversionistas ci
     JOIN creditos c ON c.id = ci.credito_id
     JOIN profiles p ON p.id = ci.inversionista_id
  GROUP BY ci.inversionista_id, ci.credito_id,
           (date_trunc('month'::text, ci.fecha_causacion::timestamp with time zone)),
           c.codigo_credito, p.full_name, ci.porcentaje_participacion;

-- 7. Comentarios
COMMENT ON COLUMN public.creditos.tasa_nominal IS 'Tasa nominal mensual — DOUBLE PRECISION (15 dígitos sin truncar)';
COMMENT ON COLUMN public.creditos.tasa_interes_ea IS 'Tasa efectiva anual — DOUBLE PRECISION (15 dígitos sin truncar)';
COMMENT ON COLUMN public.creditos.tasa_mora IS 'Tasa de mora — DOUBLE PRECISION (15 dígitos sin truncar)';
