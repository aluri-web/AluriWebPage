-- =============================================
-- SEED: Llenar campos nuevos en créditos existentes
-- Datos de prueba para visualización en admin
-- Fecha: 2026-02-17
-- =============================================

-- CR-255 | Arnulfo | $100M | activo
UPDATE public.creditos SET
    valor_comercial = 220000000,
    ciudad_inmueble = 'Bogotá',
    direccion_inmueble = 'Calle 127 #15-42, Usaquén',
    tipo_inmueble = 'apartamento',
    tasa_interes_ea = 19.56,
    comision_deudor = 3000000,
    comision_aluri_pct = 3,
    tipo_liquidacion = 'vencida',
    tipo_contrato = 'hipotecario',
    tipo_amortizacion = 'francesa'
WHERE codigo_credito = 'CR-255';

-- CR-707 | Diego Hernandez | $20M | activo
UPDATE public.creditos SET
    valor_comercial = 45000000,
    ciudad_inmueble = 'Medellín',
    direccion_inmueble = 'Carrera 43A #1-50, El Poblado',
    tipo_inmueble = 'local comercial',
    tasa_interes_ea = 19.56,
    comision_deudor = 600000,
    comision_aluri_pct = 3,
    tipo_liquidacion = 'vencida',
    tipo_contrato = 'hipotecario',
    tipo_amortizacion = 'francesa'
WHERE codigo_credito = 'CR-707';

-- CR-922 | Leonardo Marcani | $20M | aprobado
UPDATE public.creditos SET
    valor_comercial = 55000000,
    ciudad_inmueble = 'Cali',
    direccion_inmueble = 'Av. 6N #25-78, Granada',
    tipo_inmueble = 'casa',
    tasa_interes_ea = 19.56,
    comision_deudor = 600000,
    comision_aluri_pct = 3,
    tipo_liquidacion = 'anticipada',
    tipo_contrato = 'hipotecario',
    tipo_amortizacion = 'solo_interes'
WHERE codigo_credito = 'CR-922';

-- CR-944 | Jose Diaz | $20M | aprobado
UPDATE public.creditos SET
    valor_comercial = 38000000,
    ciudad_inmueble = 'Barranquilla',
    direccion_inmueble = 'Calle 84 #51B-10, Alto Prado',
    tipo_inmueble = 'apartamento',
    tasa_interes_ea = 19.56,
    comision_deudor = 600000,
    comision_aluri_pct = 3,
    tipo_liquidacion = 'vencida',
    tipo_contrato = 'retroventa',
    tipo_amortizacion = 'francesa'
WHERE codigo_credito = 'CR-944';

-- CR818 | Diego Mendoza | $150M | aprobado
UPDATE public.creditos SET
    valor_comercial = 280000000,
    ciudad_inmueble = 'Bogotá',
    direccion_inmueble = 'Carrera 7 #116-50, Santa Bárbara',
    tipo_inmueble = 'casa',
    tasa_interes_ea = 19.56,
    comision_deudor = 4500000,
    comision_aluri_pct = 3,
    tipo_liquidacion = 'vencida',
    tipo_contrato = 'hipotecario',
    tipo_amortizacion = 'francesa'
WHERE codigo_credito = 'CR818';

-- CR-7412 | Pablo Cesar | $200M | aprobado
UPDATE public.creditos SET
    valor_comercial = 350000000,
    ciudad_inmueble = 'Cartagena',
    direccion_inmueble = 'Calle del Santísimo #8-45, Centro Histórico',
    tipo_inmueble = 'casa',
    tasa_interes_ea = 19.56,
    comision_deudor = 6000000,
    comision_aluri_pct = 3,
    tipo_liquidacion = 'anticipada',
    tipo_contrato = 'hipotecario',
    tipo_amortizacion = 'francesa'
WHERE codigo_credito = 'CR-7412';

-- CR118 | Pablo Andres | $150M | aprobado
UPDATE public.creditos SET
    valor_comercial = 320000000,
    ciudad_inmueble = 'Bucaramanga',
    direccion_inmueble = 'Calle 56 #32-18, Cabecera del Llano',
    tipo_inmueble = 'apartamento',
    tasa_interes_ea = 19.56,
    comision_deudor = 4500000,
    comision_aluri_pct = 3,
    tipo_liquidacion = 'vencida',
    tipo_contrato = 'hipotecario',
    tipo_amortizacion = 'solo_interes'
WHERE codigo_credito = 'CR118';
