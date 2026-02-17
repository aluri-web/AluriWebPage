-- Migration Finance
-- Adapted from diseno_bd_fintech.md
-- Strictly adapted to use public.profiles, UUIDs, and RLS

-- Enable UUID extension if not already enabled (should be, but good practice)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- For gen_random_uuid() if needed, though usually built-in

-- 1. Tabla: creditos
CREATE TABLE IF NOT EXISTS public.creditos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.profiles(id) NOT NULL,
    codigo_credito VARCHAR(50) UNIQUE NOT NULL,
    monto_solicitado NUMERIC(15,2) NOT NULL,
    valor_colocado NUMERIC(15,2) NOT NULL,
    tasa_nominal NUMERIC(5,2) NOT NULL,
    plazo INTEGER NOT NULL,
    fecha_desembolso TIMESTAMP WITH TIME ZONE,
    fecha_primer_pago DATE,
    fecha_ultimo_pago DATE,
    producto VARCHAR(50),
    estado VARCHAR(30) CHECK (estado IN ('solicitado', 'aprobado', 'desembolsado', 'vigente', 'pagado', 'castigado', 'mora', 'anulado')),
    saldo_capital NUMERIC(15,2) DEFAULT 0,
    saldo_intereses NUMERIC(15,2) DEFAULT 0,
    saldo_mora NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creditos_cliente ON public.creditos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_creditos_estado ON public.creditos(estado);
CREATE INDEX IF NOT EXISTS idx_creditos_codigo ON public.creditos(codigo_credito);
CREATE INDEX IF NOT EXISTS idx_creditos_fecha_desembolso ON public.creditos(fecha_desembolso);

ALTER TABLE public.creditos ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own credits
CREATE POLICY "Users can view own credits" ON public.creditos
    FOR SELECT USING (auth.uid() = cliente_id);

-- Policy: Admins can view all credits
CREATE POLICY "Admins can view all credits" ON public.creditos
    FOR SELECT USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    );


-- 2. Tabla: plan_pagos
CREATE TABLE IF NOT EXISTS public.plan_pagos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credito_id UUID REFERENCES public.creditos(id) NOT NULL,
    numero_cuota INTEGER NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    valor_cuota NUMERIC(15,2) NOT NULL,
    capital NUMERIC(15,2) NOT NULL,
    intereses NUMERIC(15,2) NOT NULL,
    saldo_capital NUMERIC(15,2) NOT NULL,
    estado VARCHAR(20) CHECK (estado IN ('pendiente', 'pagada', 'vencida', 'castigada')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(credito_id, numero_cuota)
);

CREATE INDEX IF NOT EXISTS idx_plan_pagos_credito ON public.plan_pagos(credito_id);
CREATE INDEX IF NOT EXISTS idx_plan_pagos_vencimiento ON public.plan_pagos(fecha_vencimiento);

ALTER TABLE public.plan_pagos ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own payment plans via credit ownership
CREATE POLICY "Users can view own payment plans" ON public.plan_pagos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.creditos c 
            WHERE c.id = plan_pagos.credito_id 
            AND c.cliente_id = auth.uid()
        )
    );

-- Policy: Admins can view all
CREATE POLICY "Admins can view all payment plans" ON public.plan_pagos
    FOR SELECT USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    );


-- 3. Tabla: transacciones
CREATE TABLE IF NOT EXISTS public.transacciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credito_id UUID REFERENCES public.creditos(id) NOT NULL,
    tipo_transaccion VARCHAR(50) CHECK (tipo_transaccion IN ('desembolso', 'pago_capital', 'pago_interes', 'pago_mora', 'servicio_legal', 'causacion_interes', 'causacion_mora', 'castigo', 'reverso', 'ajuste')),
    concepto VARCHAR(200),
    monto NUMERIC(15,2) NOT NULL,
    fecha_transaccion TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_aplicacion DATE NOT NULL,
    numero_cuota INTEGER,
    referencia_pago VARCHAR(100),
    metodo_pago VARCHAR(30),
    usuario_registro VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transacciones_credito ON public.transacciones(credito_id, fecha_aplicacion);
CREATE INDEX IF NOT EXISTS idx_transacciones_fecha ON public.transacciones(fecha_aplicacion);
CREATE INDEX IF NOT EXISTS idx_transacciones_tipo ON public.transacciones(tipo_transaccion);

ALTER TABLE public.transacciones ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own transactions
CREATE POLICY "Users can view own transactions" ON public.transacciones
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.creditos c 
            WHERE c.id = transacciones.credito_id 
            AND c.cliente_id = auth.uid()
        )
    );

-- Policy: Admins can view all
CREATE POLICY "Admins can view all transactions" ON public.transacciones
    FOR SELECT USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    );


-- 4. Tabla: liquidaciones_mensuales
CREATE TABLE IF NOT EXISTS public.liquidaciones_mensuales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credito_id UUID REFERENCES public.creditos(id) NOT NULL,
    periodo DATE NOT NULL, -- First day of month
    saldo_inicial_capital NUMERIC(15,2),
    saldo_final_capital NUMERIC(15,2),
    capital_pagado NUMERIC(15,2) DEFAULT 0,
    intereses_corrientes_causados NUMERIC(15,2) DEFAULT 0,
    intereses_corrientes_pagados NUMERIC(15,2) DEFAULT 0,
    intereses_mora_causados NUMERIC(15,2) DEFAULT 0,
    intereses_mora_pagados NUMERIC(15,2) DEFAULT 0,
    servicios_legales NUMERIC(15,2) DEFAULT 0,
    otros_cargos NUMERIC(15,2) DEFAULT 0,
    dias_mora INTEGER DEFAULT 0,
    tasa_aplicada NUMERIC(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(credito_id, periodo)
);

CREATE INDEX IF NOT EXISTS idx_liquidaciones_credito ON public.liquidaciones_mensuales(credito_id);
CREATE INDEX IF NOT EXISTS idx_liquidaciones_periodo ON public.liquidaciones_mensuales(periodo);

ALTER TABLE public.liquidaciones_mensuales ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view own liquidations
CREATE POLICY "Users can view own liquidations" ON public.liquidaciones_mensuales
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.creditos c 
            WHERE c.id = liquidaciones_mensuales.credito_id 
            AND c.cliente_id = auth.uid()
        )
    );

-- Policy: Admins can view all
CREATE POLICY "Admins can view all liquidations" ON public.liquidaciones_mensuales
    FOR SELECT USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    );
