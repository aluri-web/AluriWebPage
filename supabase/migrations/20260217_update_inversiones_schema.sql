-- =============================================
-- Migración: Completar esquema de inversiones
-- Agrega columnas que existían en la tabla 'investments' antigua
-- y actualiza constraint de estado para flujo completo
-- Fecha: 2026-02-17
-- =============================================

-- Fecha de confirmación de la inversión
ALTER TABLE public.inversiones
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE;

-- Fecha de rechazo (si aplica)
ALTER TABLE public.inversiones
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;

-- Tasa de interés asignada al inversionista
ALTER TABLE public.inversiones
ADD COLUMN IF NOT EXISTS interest_rate_investor NUMERIC(5,2);

-- Actualizar constraint de estado para soportar flujo completo
-- (antes solo: activo, cancelado, liquidado)
ALTER TABLE public.inversiones DROP CONSTRAINT IF EXISTS inversiones_estado_check;
ALTER TABLE public.inversiones ADD CONSTRAINT inversiones_estado_check
  CHECK (estado IN ('pendiente', 'activo', 'cancelado', 'liquidado', 'rechazado'));
