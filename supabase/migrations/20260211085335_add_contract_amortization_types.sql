-- Create ENUM types for contract and amortization
CREATE TYPE public.tipo_contrato_enum AS ENUM ('hipotecario', 'retroventa');
CREATE TYPE public.tipo_amortizacion_enum AS ENUM ('francesa', 'solo_interes');

-- Add columns to creditos table with default values
ALTER TABLE public.creditos
ADD COLUMN IF NOT EXISTS tipo_contrato public.tipo_contrato_enum NOT NULL DEFAULT 'hipotecario',
ADD COLUMN IF NOT EXISTS tipo_amortizacion public.tipo_amortizacion_enum NOT NULL DEFAULT 'francesa';
