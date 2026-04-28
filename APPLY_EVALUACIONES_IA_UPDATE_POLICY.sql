-- ============================================================
-- Migración: permitir UPDATE en evaluaciones_ia para admins
-- ============================================================
-- Hasta ahora la tabla era append-only por auditoría. Cambiamos al
-- modelo "una fila por evaluación que se actualiza in-place" cuando
-- el admin sube documentos faltantes o ajusta términos del crédito.
-- El histórico que importa es la versión final entregada al inversionista
-- (que se genera desde la ficha actual al momento de cierre), por lo
-- que no necesitamos audit trail de versiones intermedias.
--
-- Ejecutar en Supabase SQL Editor.
-- ============================================================

-- Permitir UPDATE solo a admins
CREATE POLICY evaluaciones_ia_update_admin ON evaluaciones_ia
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
