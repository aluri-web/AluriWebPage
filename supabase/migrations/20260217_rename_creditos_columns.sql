-- =============================================
-- Migración: Renombrar columnas de creditos
-- Fecha: 2026-02-17
-- =============================================

-- numero_credito → codigo_credito
ALTER TABLE public.creditos RENAME COLUMN numero_credito TO codigo_credito;

-- monto_aprobado → valor_colocado
ALTER TABLE public.creditos RENAME COLUMN monto_aprobado TO valor_colocado;

-- tasa_interes → tasa_nominal
ALTER TABLE public.creditos RENAME COLUMN tasa_interes TO tasa_nominal;

-- plazo_meses → plazo
ALTER TABLE public.creditos RENAME COLUMN plazo_meses TO plazo;

-- analisis_garantia → clase
ALTER TABLE public.creditos RENAME COLUMN analisis_garantia TO clase;

-- Actualizar el índice que referencia numero_credito
DROP INDEX IF EXISTS idx_creditos_numero;
CREATE INDEX idx_creditos_codigo ON public.creditos(codigo_credito);
