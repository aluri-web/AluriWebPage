-- ============================================================
-- Tabla: evaluaciones_ia
-- Almacena resultados de evaluaciones de los agentes IA
-- Ejecutar en Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS evaluaciones_ia (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitud_id  uuid REFERENCES solicitudes_credito(id) ON DELETE SET NULL,
  admin_id      uuid NOT NULL REFERENCES auth.users(id),

  -- Datos del análisis
  applicant     jsonb NOT NULL,          -- { name, cedula }
  operation     jsonb NOT NULL,          -- datos de la operación enviados al orquestador
  documents     jsonb NOT NULL,          -- { tipo: url } mapa de documentos usados

  -- Resultados
  verdict       text,                    -- APROBAR / RECHAZAR / REVISAR
  risk_level    text,                    -- bajo / medio / alto / critico
  risk_score    smallint,                -- 0-10
  sections      jsonb,                   -- secciones del reporte completo
  pdf_url       text,                    -- URL del PDF generado (signed URL o storage path)
  evaluation_id text,                    -- ID retornado por el orquestador

  -- Metadatos
  interest_rate numeric(5,2),            -- tasa mensual usada
  processing_ms integer,                 -- duración del análisis en ms
  created_at    timestamptz DEFAULT now() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_evaluaciones_ia_solicitud ON evaluaciones_ia(solicitud_id);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_ia_admin ON evaluaciones_ia(admin_id);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_ia_created ON evaluaciones_ia(created_at DESC);

-- RLS
ALTER TABLE evaluaciones_ia ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden insertar
CREATE POLICY evaluaciones_ia_insert_admin ON evaluaciones_ia
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Solo admins pueden leer
CREATE POLICY evaluaciones_ia_select_admin ON evaluaciones_ia
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Nadie puede actualizar ni eliminar (inmutabilidad para auditoría)
-- Si se necesita en el futuro, crear políticas específicas
