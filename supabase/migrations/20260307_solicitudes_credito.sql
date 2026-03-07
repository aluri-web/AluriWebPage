-- =============================================================
-- Migración: Tabla solicitudes_credito
-- Permite a inversionistas solicitar créditos hipotecarios
-- Fecha: 2026-03-07
-- =============================================================

CREATE TABLE IF NOT EXISTS public.solicitudes_credito (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitante_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  direccion_inmueble TEXT NOT NULL,
  ciudad TEXT NOT NULL,
  tiene_hipoteca BOOLEAN DEFAULT FALSE,
  a_nombre_solicitante BOOLEAN DEFAULT TRUE,
  monto_requerido NUMERIC(15,2) NOT NULL,
  valor_inmueble NUMERIC(15,2) NOT NULL,
  uso_dinero TEXT,
  documentos JSONB DEFAULT '[]'::JSONB,
  fotos JSONB DEFAULT '[]'::JSONB,
  estado VARCHAR(20) DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'en_revision', 'aprobada', 'rechazada')),
  notas_admin TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.solicitudes_credito ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own solicitudes"
  ON public.solicitudes_credito FOR SELECT
  USING (auth.uid() = solicitante_id);

CREATE POLICY "Users can insert own solicitudes"
  ON public.solicitudes_credito FOR INSERT
  WITH CHECK (auth.uid() = solicitante_id);

CREATE POLICY "Admins can read all solicitudes"
  ON public.solicitudes_credito FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update solicitudes"
  ON public.solicitudes_credito FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
