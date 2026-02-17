-- Add risk profile fields to creditos table
ALTER TABLE public.creditos
ADD COLUMN IF NOT EXISTS ingresos_mensuales NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS profesion VARCHAR(100),
ADD COLUMN IF NOT EXISTS clase TEXT;
