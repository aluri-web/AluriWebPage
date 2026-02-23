-- =============================================
-- Migración: Permitir a inversionistas ver nombre del propietario
-- Usa SECURITY DEFINER para evitar recursión en RLS
-- Fecha: 2026-02-23
-- =============================================

-- Paso 1: Eliminar política problemática si existe
DROP POLICY IF EXISTS "Investors can view propietario profiles" ON public.profiles;

-- Paso 2: Función SECURITY DEFINER que bypasea RLS internamente
CREATE OR REPLACE FUNCTION public.is_propietario_of_investor_credit(profile_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.creditos c
    INNER JOIN public.inversiones i ON i.credito_id = c.id
    WHERE c.cliente_id = profile_id
    AND i.inversionista_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Paso 3: Política sin recursión
CREATE POLICY "Investors can view propietario profiles"
ON public.profiles
FOR SELECT USING (
    public.is_propietario_of_investor_credit(id)
);
