-- =============================================
-- Migración: Índices de rendimiento para transacciones
-- Objetivo: Optimizar queries de "Últimas Actividades" en dashboard
-- Fecha: 2026-02-17
-- =============================================
--
-- ÍNDICES EXISTENTES (no tocar):
--   idx_transacciones_credito  → (credito_id, fecha_aplicacion)  -- Historial del préstamo
--   idx_transacciones_fecha    → (fecha_aplicacion)               -- Orden por fecha contable
--   idx_transacciones_tipo     → (tipo_transaccion)               -- Filtro por tipo
--
-- NUEVOS ÍNDICES:
-- =============================================

-- 1. Índice DESC sobre created_at para "Últimas Actividades" global
--    Nombre diferente al existente (que cubre fecha_aplicacion, no created_at)
CREATE INDEX IF NOT EXISTS idx_transacciones_created_desc
ON public.transacciones(created_at DESC);

-- 2. Índice compuesto para "Mis últimos movimientos por crédito"
--    Cubre: SELECT ... WHERE credito_id = $1 ORDER BY created_at DESC LIMIT N
CREATE INDEX IF NOT EXISTS idx_transacciones_credito_created
ON public.transacciones(credito_id, created_at DESC);

-- 3. Índice parcial para pagos recientes (tipos más consultados en dashboard)
--    Cubre: SELECT ... WHERE tipo_transaccion IN ('pago_capital','pago_interes','pago_mora') ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_transacciones_pagos_recientes
ON public.transacciones(created_at DESC)
WHERE tipo_transaccion IN ('pago_capital', 'pago_interes', 'pago_mora');

-- 4. Índice sobre referencia_pago para búsqueda de comprobantes
CREATE INDEX IF NOT EXISTS idx_transacciones_referencia
ON public.transacciones(referencia_pago)
WHERE referencia_pago IS NOT NULL;
