-- =============================================================
-- Migración: Sistema de API Keys
-- Fecha: 2026-02-24
-- Descripción: Tabla para gestionar API Keys para acceso programático
-- =============================================================

-- 1. Tabla: api_keys
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,  -- Nombre descriptivo (ej: "MCP Claude", "Bot Telegram")
    key_hash VARCHAR(64) NOT NULL UNIQUE,  -- SHA-256 hash de la API key
    key_prefix VARCHAR(8) NOT NULL,  -- Primeros 8 caracteres para identificación (ej: "aluri_mk")
    permisos JSONB DEFAULT '["read"]',  -- Array de permisos: read, write, admin
    activa BOOLEAN DEFAULT true,
    ultimo_uso TIMESTAMP WITH TIME ZONE,
    usos_totales INTEGER DEFAULT 0,
    ip_permitidas TEXT[],  -- IPs permitidas (null = todas)
    creado_por UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,  -- Fecha de expiración (null = nunca)

    CONSTRAINT api_keys_nombre_unique UNIQUE(nombre)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON public.api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_activa ON public.api_keys(activa);

-- RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver y modificar API keys
CREATE POLICY "Solo admins acceden api_keys" ON public.api_keys
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- 2. Tabla: api_key_logs (auditoría de uso)
CREATE TABLE IF NOT EXISTS public.api_key_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
    endpoint VARCHAR(200) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para consultas de logs
CREATE INDEX IF NOT EXISTS idx_api_key_logs_key ON public.api_key_logs(api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_key_logs_fecha ON public.api_key_logs(created_at DESC);

-- RLS para logs
ALTER TABLE public.api_key_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Solo admins ven logs api_keys" ON public.api_key_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- 3. Función para actualizar estadísticas de uso
CREATE OR REPLACE FUNCTION public.registrar_uso_api_key(p_key_hash VARCHAR)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_key_id UUID;
BEGIN
    -- Actualizar contador y último uso
    UPDATE public.api_keys
    SET
        ultimo_uso = NOW(),
        usos_totales = usos_totales + 1
    WHERE key_hash = p_key_hash
      AND activa = true
      AND (expires_at IS NULL OR expires_at > NOW())
    RETURNING id INTO v_key_id;

    RETURN v_key_id;
END;
$$;

-- 4. Comentarios
COMMENT ON TABLE public.api_keys IS 'API Keys para acceso programático a los endpoints';
COMMENT ON COLUMN public.api_keys.key_hash IS 'SHA-256 hash de la API key - nunca almacenamos la key en texto plano';
COMMENT ON COLUMN public.api_keys.key_prefix IS 'Primeros 8 caracteres para identificar la key sin revelarla';
COMMENT ON COLUMN public.api_keys.permisos IS 'Array JSON de permisos: read, write, admin';
