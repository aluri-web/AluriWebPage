-- =============================================================
-- Migración: Sistema de Causación Diaria de Intereses
-- Fecha: 2026-02-23
-- Descripción: Tabla para registrar cálculos diarios de intereses por crédito
-- =============================================================

-- 1. Tabla: causaciones_diarias
-- Registra el cálculo diario de intereses para cada crédito activo
CREATE TABLE IF NOT EXISTS public.causaciones_diarias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credito_id UUID REFERENCES public.creditos(id) ON DELETE CASCADE NOT NULL,
    fecha_causacion DATE NOT NULL,
    saldo_base NUMERIC(15,2) NOT NULL,  -- Saldo de capital al momento del cálculo
    tasa_nominal NUMERIC(5,2) NOT NULL,  -- Tasa nominal mensual del crédito
    tasa_diaria NUMERIC(10,8) NOT NULL,  -- Tasa diaria calculada
    interes_causado NUMERIC(15,2) NOT NULL,  -- Interés del día
    mora_causada NUMERIC(15,2) DEFAULT 0,  -- Mora del día (si aplica)
    dias_mora INTEGER DEFAULT 0,  -- Días de mora acumulados al momento
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Evitar duplicados: un solo registro por crédito por día
    CONSTRAINT uq_causacion_credito_fecha UNIQUE(credito_id, fecha_causacion)
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_causaciones_fecha ON public.causaciones_diarias(fecha_causacion);
CREATE INDEX IF NOT EXISTS idx_causaciones_credito ON public.causaciones_diarias(credito_id);
CREATE INDEX IF NOT EXISTS idx_causaciones_credito_fecha ON public.causaciones_diarias(credito_id, fecha_causacion DESC);

-- RLS
ALTER TABLE public.causaciones_diarias ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios pueden ver causaciones de sus créditos
CREATE POLICY "Usuarios ven causaciones de sus creditos" ON public.causaciones_diarias
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.creditos c
            WHERE c.id = causaciones_diarias.credito_id
            AND c.cliente_id = auth.uid()
        )
    );

-- Política: Inversionistas pueden ver causaciones de créditos donde invierten
CREATE POLICY "Inversionistas ven causaciones de sus inversiones" ON public.causaciones_diarias
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.inversiones i
            WHERE i.credito_id = causaciones_diarias.credito_id
            AND i.inversionista_id = auth.uid()
            AND i.estado = 'activo'
        )
    );

-- Política: Admins pueden ver y modificar todo
CREATE POLICY "Admins acceso completo causaciones" ON public.causaciones_diarias
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- 2. Función helper para calcular tasa diaria desde tasa nominal mensual
-- Fórmula: tasa_diaria = (1 + tasa_nominal/100)^(1/30) - 1
CREATE OR REPLACE FUNCTION public.calcular_tasa_diaria(tasa_nominal NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN POWER(1 + (tasa_nominal / 100.0), 1.0 / 30.0) - 1;
END;
$$;

-- 3. Comentarios para documentación
COMMENT ON TABLE public.causaciones_diarias IS 'Registro histórico de causación diaria de intereses por crédito';
COMMENT ON COLUMN public.causaciones_diarias.tasa_diaria IS 'Tasa diaria efectiva = (1 + tasa_nominal/100)^(1/30) - 1';
COMMENT ON COLUMN public.causaciones_diarias.interes_causado IS 'Interés del día = saldo_base × tasa_diaria';
COMMENT ON COLUMN public.causaciones_diarias.mora_causada IS 'Mora del día = saldo_base × tasa_diaria × 1.5 (si días_mora > 0)';
