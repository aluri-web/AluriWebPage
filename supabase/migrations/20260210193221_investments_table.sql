-- Create inversiones table
CREATE TABLE IF NOT EXISTS public.inversiones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credito_id UUID REFERENCES public.creditos(id) ON DELETE CASCADE NOT NULL,
    inversionista_id UUID REFERENCES public.profiles(id) NOT NULL,
    monto_invertido NUMERIC(15,2) NOT NULL,
    porcentaje_participacion NUMERIC(5,2),
    fecha_inversion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'cancelado', 'liquidado')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.inversiones ENABLE ROW LEVEL SECURITY;

-- Policy: Investors can see their own investments
CREATE POLICY "Los inversionistas pueden ver sus propias inversiones" ON public.inversiones
    FOR SELECT USING (auth.uid() = inversionista_id);

-- Policy: Admins can see all investments
CREATE POLICY "Los administradores pueden ver todas las inversiones" ON public.inversiones
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );
