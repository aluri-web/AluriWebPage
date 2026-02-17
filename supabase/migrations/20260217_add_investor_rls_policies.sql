-- =============================================
-- Migración: Políticas RLS para inversionistas
-- Problema: Los inversionistas no pueden ver las transacciones
-- ni las inversiones de otros en créditos donde participan.
-- Resultado: Dashboard muestra $0 en Capital Recuperado,
-- Intereses Ganados y Recaudado Total.
-- Fecha: 2026-02-17
-- =============================================

-- PASO 0: Eliminar la política recursiva si ya se creó
DROP POLICY IF EXISTS "Investors can view all investments on shared credits" ON public.inversiones;

-- PASO 1: Función helper SECURITY DEFINER para evitar recursión
-- Esta función bypasea RLS internamente, evitando el loop infinito
-- cuando una policy en inversiones necesita consultar inversiones.
CREATE OR REPLACE FUNCTION public.user_has_investment_in_credit(credit_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.inversiones
    WHERE credito_id = credit_id
    AND inversionista_id = auth.uid()
    AND estado IN ('activo', 'pendiente')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PASO 2: TRANSACCIONES - Inversionistas pueden ver transacciones
--         de créditos donde tienen una inversión activa
DROP POLICY IF EXISTS "Investors can view transactions on their credits" ON public.transacciones;
CREATE POLICY "Investors can view transactions on their credits"
ON public.transacciones
FOR SELECT USING (
    public.user_has_investment_in_credit(transacciones.credito_id)
);

-- PASO 3: INVERSIONES - Inversionistas pueden ver TODAS las inversiones
--         de créditos donde participan (usa la función para evitar recursión)
CREATE POLICY "Investors can view all investments on shared credits"
ON public.inversiones
FOR SELECT USING (
    public.user_has_investment_in_credit(inversiones.credito_id)
);

-- PASO 4: CREDITOS - Inversionistas pueden ver créditos donde invirtieron
DROP POLICY IF EXISTS "Investors can view credits they invested in" ON public.creditos;
CREATE POLICY "Investors can view credits they invested in"
ON public.creditos
FOR SELECT USING (
    public.user_has_investment_in_credit(creditos.id)
);
