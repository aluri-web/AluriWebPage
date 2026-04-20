-- =============================================================
-- Migración: Sistema de tracking de eventos de usuario
-- Fecha: 2026-04-20
-- Descripción: Tabla para registrar acciones de propietarios,
--              inversionistas y admins para análisis de uso.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.user_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role TEXT,                                    -- 'admin' | 'propietario' | 'inversionista' | null
  event TEXT NOT NULL,                          -- 'solicitud_iniciada', 'inversion_completada', etc.
  source TEXT NOT NULL DEFAULT 'server',        -- 'server' | 'client'
  metadata JSONB DEFAULT '{}'::jsonb,           -- payload arbitrario (credito_id, monto, etc.)
  path TEXT,                                    -- ruta del cliente (solo source='client')
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para consultas del dashboard
CREATE INDEX IF NOT EXISTS idx_user_events_user ON public.user_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_event ON public.user_events(event, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_role_date ON public.user_events(role, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_created ON public.user_events(created_at DESC);

-- RLS: solo admins leen todo; el usuario puede leer sus propios eventos
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins acceso total a eventos" ON public.user_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Usuarios leen sus propios eventos" ON public.user_events
  FOR SELECT USING (user_id = auth.uid());

-- Inserts: cualquier usuario autenticado puede registrar sus eventos
CREATE POLICY "Usuarios registran sus eventos" ON public.user_events
  FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

COMMENT ON TABLE public.user_events IS 'Tracking de acciones de usuarios para dashboards de uso';
COMMENT ON COLUMN public.user_events.event IS 'Nombre del evento en snake_case (ej: solicitud_enviada)';
COMMENT ON COLUMN public.user_events.source IS 'Origen del evento: server (server action) o client (página/componente)';
COMMENT ON COLUMN public.user_events.metadata IS 'Datos adicionales del evento en JSON';
