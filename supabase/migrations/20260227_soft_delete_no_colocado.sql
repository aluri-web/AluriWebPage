-- =============================================
-- Migración: Soft delete de créditos (no_colocado)
-- En vez de borrar créditos, cambian a estado 'no_colocado'.
-- Fecha: 2026-02-27
-- =============================================

-- Actualizar constraint de estado para incluir 'no_colocado'
ALTER TABLE public.creditos DROP CONSTRAINT IF EXISTS creditos_estado_check;
ALTER TABLE public.creditos ADD CONSTRAINT creditos_estado_check
  CHECK (estado IN (
    'solicitado', 'aprobado', 'publicado', 'en_firma', 'firmado',
    'activo', 'finalizado', 'pagado', 'castigado', 'mora', 'anulado',
    'no_colocado'
  ));
