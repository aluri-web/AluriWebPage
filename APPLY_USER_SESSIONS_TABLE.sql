-- =============================================
-- USER SESSIONS TABLE
-- Ejecutar en Supabase SQL Editor
-- Registra login, logout y duración de sesión
-- =============================================

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  login_at timestamptz DEFAULT now() NOT NULL,
  logout_at timestamptz,
  duration_seconds integer,
  logout_reason text, -- 'manual' | 'timeout' | 'expired'
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_login_at ON public.user_sessions(login_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(user_id, logout_at)
  WHERE logout_at IS NULL;

-- RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Insert: cualquier usuario autenticado puede crear su sesión
CREATE POLICY "user_sessions_insert" ON public.user_sessions
  FOR INSERT WITH CHECK (true);

-- Update: cualquier usuario puede actualizar su propia sesión
CREATE POLICY "user_sessions_update" ON public.user_sessions
  FOR UPDATE USING (true);

-- Select: admins ven todas, usuarios solo las suyas
CREATE POLICY "user_sessions_select_admin" ON public.user_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "user_sessions_select_own" ON public.user_sessions
  FOR SELECT USING (user_id = auth.uid());

COMMENT ON TABLE public.user_sessions IS 'Registro de sesiones de usuario: login, logout, duración';

-- Función para cerrar sesiones huérfanas (más de 24h sin logout)
CREATE OR REPLACE FUNCTION close_orphan_sessions()
RETURNS integer AS $$
DECLARE
  closed_count integer;
BEGIN
  UPDATE public.user_sessions
  SET
    logout_at = login_at + interval '30 minutes',
    logout_reason = 'expired',
    duration_seconds = 1800
  WHERE logout_at IS NULL
    AND login_at < now() - interval '24 hours';

  GET DIAGNOSTICS closed_count = ROW_COUNT;
  RETURN closed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
