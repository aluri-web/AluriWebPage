-- Tabla para almacenar tasas oficiales de la Superintendencia Financiera de Colombia
-- Se actualiza mensualmente cuando la SFC publica nuevas certificaciones

CREATE TABLE IF NOT EXISTS public.tasas_oficiales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL, -- 'ibc_consumo', 'usura_consumo', 'ibc_microcredito', 'usura_microcredito'
  tasa_ea NUMERIC(5,2) NOT NULL, -- Tasa efectiva anual
  vigencia_desde DATE NOT NULL,
  vigencia_hasta DATE NOT NULL,
  fuente TEXT DEFAULT 'Superintendencia Financiera de Colombia',
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),

  -- Evitar duplicados para el mismo tipo y periodo
  CONSTRAINT tasas_oficiales_unique UNIQUE (tipo, vigencia_desde)
);

-- Índices para consultas rápidas
CREATE INDEX idx_tasas_oficiales_tipo ON public.tasas_oficiales(tipo);
CREATE INDEX idx_tasas_oficiales_vigencia ON public.tasas_oficiales(vigencia_desde, vigencia_hasta);

-- RLS
ALTER TABLE public.tasas_oficiales ENABLE ROW LEVEL SECURITY;

-- Todos pueden leer las tasas
CREATE POLICY "Tasas oficiales visibles para todos"
ON public.tasas_oficiales FOR SELECT
USING (true);

-- Solo admins pueden modificar
CREATE POLICY "Solo admins modifican tasas"
ON public.tasas_oficiales FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Función para obtener la tasa vigente de un tipo específico
CREATE OR REPLACE FUNCTION public.obtener_tasa_vigente(p_tipo TEXT, p_fecha DATE DEFAULT CURRENT_DATE)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_tasa NUMERIC;
BEGIN
  SELECT tasa_ea INTO v_tasa
  FROM public.tasas_oficiales
  WHERE tipo = p_tipo
    AND p_fecha BETWEEN vigencia_desde AND vigencia_hasta
  ORDER BY vigencia_desde DESC
  LIMIT 1;

  RETURN v_tasa;
END;
$$;

-- Función para calcular interés de mora
-- La tasa de mora máxima legal es la tasa de usura (1.5x el IBC)
CREATE OR REPLACE FUNCTION public.calcular_tasa_mora_diaria(p_fecha DATE DEFAULT CURRENT_DATE)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_tasa_usura NUMERIC;
  v_tasa_diaria NUMERIC;
BEGIN
  -- Obtener tasa de usura vigente
  v_tasa_usura := public.obtener_tasa_vigente('usura_consumo', p_fecha);

  -- Si no hay tasa registrada, usar 24.36% (valor actual)
  IF v_tasa_usura IS NULL THEN
    v_tasa_usura := 24.36;
  END IF;

  -- Convertir EA a tasa diaria: (1 + tasa_ea/100)^(1/365) - 1
  v_tasa_diaria := POWER(1 + (v_tasa_usura / 100.0), 1.0 / 365.0) - 1;

  RETURN v_tasa_diaria;
END;
$$;

-- Insertar tasas vigentes actuales (Enero-Febrero 2026)
INSERT INTO public.tasas_oficiales (tipo, tasa_ea, vigencia_desde, vigencia_hasta) VALUES
  ('ibc_consumo', 16.24, '2026-01-01', '2026-01-31'),
  ('usura_consumo', 24.36, '2026-01-01', '2026-01-31'),
  ('ibc_consumo', 15.87, '2026-02-01', '2026-02-28'),
  ('usura_consumo', 23.81, '2026-02-01', '2026-02-28'),
  ('ibc_consumo', 15.50, '2026-03-01', '2026-03-31'),
  ('usura_consumo', 23.25, '2026-03-01', '2026-03-31');

-- Comentarios
COMMENT ON TABLE public.tasas_oficiales IS 'Tasas de interés oficiales certificadas por la Superintendencia Financiera de Colombia';
COMMENT ON COLUMN public.tasas_oficiales.tipo IS 'Tipo de tasa: ibc_consumo, usura_consumo, ibc_microcredito, usura_microcredito';
COMMENT ON COLUMN public.tasas_oficiales.tasa_ea IS 'Tasa efectiva anual en porcentaje';
COMMENT ON FUNCTION public.obtener_tasa_vigente IS 'Obtiene la tasa vigente para un tipo y fecha específicos';
COMMENT ON FUNCTION public.calcular_tasa_mora_diaria IS 'Calcula la tasa de mora diaria basada en la tasa de usura vigente';
