-- =============================================================
-- Migración: Distribución de Causaciones a Inversionistas
-- Fecha: 2026-02-23
-- Descripción: Tabla para registrar la distribución de intereses causados
--              proporcionalmente a cada inversionista
-- =============================================================

-- 1. Tabla: causaciones_inversionistas
-- Distribuye el interés causado diario entre los inversionistas del crédito
CREATE TABLE IF NOT EXISTS public.causaciones_inversionistas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    causacion_id UUID REFERENCES public.causaciones_diarias(id) ON DELETE CASCADE NOT NULL,
    inversion_id UUID REFERENCES public.inversiones(id) ON DELETE CASCADE NOT NULL,
    inversionista_id UUID REFERENCES public.profiles(id) NOT NULL,
    credito_id UUID REFERENCES public.creditos(id) ON DELETE CASCADE NOT NULL,
    fecha_causacion DATE NOT NULL,
    porcentaje_participacion NUMERIC(5,2) NOT NULL,  -- % de participación en el crédito
    interes_atribuido NUMERIC(15,2) NOT NULL,  -- Interés proporcional del día
    mora_atribuida NUMERIC(15,2) DEFAULT 0,  -- Mora proporcional del día
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Evitar duplicados: una distribución por inversión por día
    CONSTRAINT uq_causacion_inversionista_fecha UNIQUE(inversion_id, fecha_causacion)
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_causacion_inv_inversionista ON public.causaciones_inversionistas(inversionista_id);
CREATE INDEX IF NOT EXISTS idx_causacion_inv_fecha ON public.causaciones_inversionistas(fecha_causacion);
CREATE INDEX IF NOT EXISTS idx_causacion_inv_credito ON public.causaciones_inversionistas(credito_id);
CREATE INDEX IF NOT EXISTS idx_causacion_inv_inversionista_fecha ON public.causaciones_inversionistas(inversionista_id, fecha_causacion DESC);

-- RLS
ALTER TABLE public.causaciones_inversionistas ENABLE ROW LEVEL SECURITY;

-- Política: Inversionistas pueden ver sus propias causaciones
CREATE POLICY "Inversionistas ven sus causaciones" ON public.causaciones_inversionistas
    FOR SELECT USING (auth.uid() = inversionista_id);

-- Política: Admins pueden ver y modificar todo
CREATE POLICY "Admins acceso completo causaciones inversionistas" ON public.causaciones_inversionistas
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- 2. Vista: Resumen mensual de causaciones por inversionista
-- Útil para reportes y extractos mensuales
CREATE OR REPLACE VIEW public.resumen_causaciones_mensual AS
SELECT
    ci.inversionista_id,
    ci.credito_id,
    DATE_TRUNC('month', ci.fecha_causacion)::DATE AS mes,
    c.codigo_credito,
    p.full_name AS nombre_inversionista,
    ci.porcentaje_participacion,
    COUNT(*) AS dias_causados,
    SUM(ci.interes_atribuido) AS interes_mes,
    SUM(ci.mora_atribuida) AS mora_mes,
    SUM(ci.interes_atribuido + ci.mora_atribuida) AS total_mes
FROM public.causaciones_inversionistas ci
JOIN public.creditos c ON c.id = ci.credito_id
JOIN public.profiles p ON p.id = ci.inversionista_id
GROUP BY
    ci.inversionista_id,
    ci.credito_id,
    DATE_TRUNC('month', ci.fecha_causacion),
    c.codigo_credito,
    p.full_name,
    ci.porcentaje_participacion;

-- 3. Comentarios
COMMENT ON TABLE public.causaciones_inversionistas IS 'Distribución diaria de intereses causados a inversionistas según participación';
COMMENT ON VIEW public.resumen_causaciones_mensual IS 'Resumen mensual de intereses causados por inversionista y crédito';
