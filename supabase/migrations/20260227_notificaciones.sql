-- =============================================
-- Migración: Sistema de notificaciones
-- Crea tabla notificaciones para alertar a inversionistas
-- cuando sus inversiones son aprobadas o rechazadas.
-- También agrega motivo_rechazo a inversiones.
-- Fecha: 2026-02-27
-- =============================================

-- Tabla de notificaciones
CREATE TABLE IF NOT EXISTS public.notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  leida BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_notificaciones_user_id ON public.notificaciones(user_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_user_leida ON public.notificaciones(user_id, leida) WHERE leida = FALSE;

-- Habilitar RLS
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden leer sus propias notificaciones
CREATE POLICY "Users can read own notifications"
  ON public.notificaciones FOR SELECT
  USING (auth.uid() = user_id);

-- Los usuarios pueden actualizar sus propias notificaciones (marcar como leída)
CREATE POLICY "Users can update own notifications"
  ON public.notificaciones FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins pueden ver y gestionar todas las notificaciones
CREATE POLICY "Admins can manage all notifications"
  ON public.notificaciones FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Agregar motivo de rechazo a inversiones
ALTER TABLE public.inversiones
ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT;
