-- Add INSERT/UPDATE/DELETE policies for admins on finance tables

-- 1. Creditos
CREATE POLICY "Admins can manage all credits" ON public.creditos
    FOR ALL USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    );

-- 2. Plan de Pagos
CREATE POLICY "Admins can manage all payment plans" ON public.plan_pagos
    FOR ALL USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    );

-- 3. Transacciones
CREATE POLICY "Admins can manage all transactions" ON public.transacciones
    FOR ALL USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    );

-- 4. Liquidaciones Mensuales
CREATE POLICY "Admins can manage all liquidations" ON public.liquidaciones_mensuales
    FOR ALL USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    );
