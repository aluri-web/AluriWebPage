-- ========================================
-- Nuevas columnas operativas para creditos
-- ========================================

-- Escritura (número de escritura pública)
ALTER TABLE public.creditos
ADD COLUMN IF NOT EXISTS escritura INTEGER;

-- Fechas del proceso
ALTER TABLE public.creditos
ADD COLUMN IF NOT EXISTS fecha_registro TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.creditos
ADD COLUMN IF NOT EXISTS fecha_llegada_lead TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.creditos
ADD COLUMN IF NOT EXISTS fecha_firma TIMESTAMP WITH TIME ZONE;
-- NOTA: fecha_firma = fecha real de firma. fecha_firma_programada = fecha planeada (ya existente).

ALTER TABLE public.creditos
ADD COLUMN IF NOT EXISTS fecha_control TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.creditos
ADD COLUMN IF NOT EXISTS mes_registro TIMESTAMP WITH TIME ZONE;

-- Días de gestión (calculables, pero almacenados para reportes rápidos)
ALTER TABLE public.creditos
ADD COLUMN IF NOT EXISTS dias_notaria INTEGER DEFAULT 0;

ALTER TABLE public.creditos
ADD COLUMN IF NOT EXISTS dias_registro INTEGER DEFAULT 0;

ALTER TABLE public.creditos
ADD COLUMN IF NOT EXISTS dias_totales_desembolso INTEGER DEFAULT 0;

ALTER TABLE public.creditos
ADD COLUMN IF NOT EXISTS meses_activo INTEGER DEFAULT 0;

-- Estado del crédito post-desembolso (activo o pagado)
-- Diferente a "estado" que maneja el workflow completo del crédito
ALTER TABLE public.creditos
ADD COLUMN IF NOT EXISTS estado_credito VARCHAR(20) DEFAULT 'activo'
  CHECK (estado_credito IN ('activo', 'pagado'));

-- NIR (Número de Inscripción de Registro)
ALTER TABLE public.creditos
ADD COLUMN IF NOT EXISTS nir BIGINT;

-- Checklist documental (si/no)
ALTER TABLE public.creditos
ADD COLUMN IF NOT EXISTS doc_priv BOOLEAN DEFAULT FALSE;

ALTER TABLE public.creditos
ADD COLUMN IF NOT EXISTS clt BOOLEAN DEFAULT FALSE;

ALTER TABLE public.creditos
ADD COLUMN IF NOT EXISTS escrit BOOLEAN DEFAULT FALSE;

-- LTV (Loan to Value) calculado al crear/actualizar crédito
ALTER TABLE public.creditos
ADD COLUMN IF NOT EXISTS ltv NUMERIC(5,2);

-- Pagador (quien paga los costos de notaria/registro)
ALTER TABLE public.creditos
ADD COLUMN IF NOT EXISTS pagador VARCHAR(20) DEFAULT 'deudor'
  CHECK (pagador IN ('aluri', 'deudor', 'acreedor'));
