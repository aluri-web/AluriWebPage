-- =============================================================
-- Migracion: Permitir que propietarios actualicen docs/fotos
-- de sus solicitudes pendientes o en revision
-- Fecha: 2026-03-09
-- =============================================================

CREATE POLICY "Users can update own pending solicitudes"
  ON public.solicitudes_credito FOR UPDATE
  USING (auth.uid() = solicitante_id AND estado IN ('pendiente', 'en_revision'))
  WITH CHECK (auth.uid() = solicitante_id AND estado IN ('pendiente', 'en_revision'));
