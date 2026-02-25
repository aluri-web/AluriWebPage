import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SERVICE_ROLE_KEY) {
  console.error('ERROR: Falta SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DRY_RUN = process.argv.includes('--dry-run');

// =====================================================
// DATA: Detalles financieros de cada crédito (del CSV)
// =====================================================

interface CreditDetails {
  codigo: string;
  tipo_inmueble?: string;
  valor_comercial: number;
  valor_colocado: number;
  ltv: number;
  tasa_nominal: number;
  tasa_interes_ea: number;
  plazo: number;
  tipo_liquidacion: string;
  tipo_amortizacion: string;
  tipo_contrato: string;
  notaria?: string;
  costos_notaria?: number;
  fecha_desembolso?: string; // ISO date YYYY-MM-DD
}

const CREDITS: CreditDetails[] = [
  {
    codigo: 'CR001',
    tipo_inmueble: 'casa',
    valor_comercial: 450000000,
    valor_colocado: 200000000,
    ltv: 44.44,
    tasa_nominal: 2.00,
    tasa_interes_ea: 26.82,
    plazo: 84,
    tipo_liquidacion: 'anticipada',
    tipo_amortizacion: 'francesa',
    tipo_contrato: 'hipotecario',
    notaria: '8',
    fecha_desembolso: '2025-03-04',
  },
  {
    codigo: 'CR002',
    tipo_inmueble: 'casa',
    valor_comercial: 380000000,
    valor_colocado: 220000000,
    ltv: 57.89,
    tasa_nominal: 2.00,
    tasa_interes_ea: 26.82,
    plazo: 120,
    tipo_liquidacion: 'anticipada',
    tipo_amortizacion: 'francesa',
    tipo_contrato: 'hipotecario',
    notaria: '44',
    fecha_desembolso: '2025-04-11',
  },
  {
    codigo: 'CR003',
    tipo_inmueble: 'casa',
    valor_comercial: 220000000,
    valor_colocado: 50000000,
    ltv: 22.73,
    tasa_nominal: 1.80,
    tasa_interes_ea: 23.87,
    plazo: 72,
    tipo_liquidacion: 'anticipada',
    tipo_amortizacion: 'francesa',
    tipo_contrato: 'hipotecario',
    notaria: '44',
    fecha_desembolso: '2025-05-05',
  },
  {
    codigo: 'CR004',
    tipo_inmueble: 'casa',
    valor_comercial: 305000000,
    valor_colocado: 100000000,
    ltv: 32.79,
    tasa_nominal: 2.00,
    tasa_interes_ea: 26.82,
    plazo: 60,
    tipo_liquidacion: 'anticipada',
    tipo_amortizacion: 'solo_interes',
    tipo_contrato: 'hipotecario',
    notaria: '20',
    fecha_desembolso: '2025-06-11',
  },
  {
    codigo: 'CR005',
    tipo_inmueble: 'apartamento',
    valor_comercial: 350000000,
    valor_colocado: 120000000,
    ltv: 34.29,
    tasa_nominal: 2.50,
    tasa_interes_ea: 34.49,
    plazo: 24,
    tipo_liquidacion: 'anticipada',
    tipo_amortizacion: 'solo_interes',
    tipo_contrato: 'hipotecario',
    notaria: '20',
    fecha_desembolso: '2025-07-23',
  },
  {
    codigo: 'CR006',
    tipo_inmueble: 'lote',
    valor_comercial: 1950000000,
    valor_colocado: 143000000,
    ltv: 7.33,
    tasa_nominal: 1.90,
    tasa_interes_ea: 25.34,
    plazo: 48,
    tipo_liquidacion: 'vencida',
    tipo_amortizacion: 'francesa',
    tipo_contrato: 'hipotecario',
    notaria: '20',
    fecha_desembolso: '2025-08-16',
  },
  {
    codigo: 'CR007',
    valor_comercial: 190000000,
    valor_colocado: 35000000,
    ltv: 18.42,
    tasa_nominal: 1.95,
    tasa_interes_ea: 26.08,
    plazo: 36,
    tipo_liquidacion: 'anticipada',
    tipo_amortizacion: 'solo_interes',
    tipo_contrato: 'hipotecario',
    notaria: '44',
    fecha_desembolso: '2025-07-30',
  },
  {
    codigo: 'CR008',
    valor_comercial: 400000000,
    valor_colocado: 80000000,
    ltv: 20.00,
    tasa_nominal: 2.00,
    tasa_interes_ea: 26.82,
    plazo: 120,
    tipo_liquidacion: 'anticipada',
    tipo_amortizacion: 'francesa',
    tipo_contrato: 'hipotecario',
    notaria: '3',
    fecha_desembolso: '2025-10-10',
  },
  {
    codigo: 'CR009',
    tipo_inmueble: 'oficina',
    valor_comercial: 450000000,
    valor_colocado: 100000000,
    ltv: 22.22,
    tasa_nominal: 1.80,
    tasa_interes_ea: 23.87,
    plazo: 12,
    tipo_liquidacion: 'anticipada',
    tipo_amortizacion: 'solo_interes',
    tipo_contrato: 'hipotecario',
    notaria: '3',
    fecha_desembolso: '2025-10-29',
  },
  {
    codigo: 'CR010',
    tipo_inmueble: 'casa',
    valor_comercial: 400000000,
    valor_colocado: 160000000,
    ltv: 40.00,
    tasa_nominal: 1.80,
    tasa_interes_ea: 23.87,
    plazo: 120,
    tipo_liquidacion: 'anticipada',
    tipo_amortizacion: 'francesa',
    tipo_contrato: 'hipotecario',
    notaria: '3',
    fecha_desembolso: '2025-12-10',
  },
  {
    codigo: 'CR011',
    tipo_inmueble: 'predio rural',
    valor_comercial: 500000000,
    valor_colocado: 200000000,
    ltv: 40.00,
    tasa_nominal: 1.82,
    tasa_interes_ea: 24.16,
    plazo: 72,
    tipo_liquidacion: 'anticipada',
    tipo_amortizacion: 'francesa',
    tipo_contrato: 'hipotecario',
    notaria: '67',
    costos_notaria: 787802,
    fecha_desembolso: '2025-12-12',
  },
  {
    codigo: 'CR012',
    tipo_inmueble: 'apartamento',
    valor_comercial: 200000000,
    valor_colocado: 40000000,
    ltv: 20.00,
    tasa_nominal: 1.80,
    tasa_interes_ea: 23.87,
    plazo: 60,
    tipo_liquidacion: 'anticipada',
    tipo_amortizacion: 'francesa',
    tipo_contrato: 'hipotecario',
    notaria: '67',
    costos_notaria: 825905,
    fecha_desembolso: '2025-12-03',
  },
  {
    codigo: 'CR013',
    tipo_inmueble: 'casa',
    valor_comercial: 320000000,
    valor_colocado: 140000000,
    ltv: 43.75,
    tasa_nominal: 1.82,
    tasa_interes_ea: 24.16,
    plazo: 72,
    tipo_liquidacion: 'anticipada',
    tipo_amortizacion: 'francesa',
    tipo_contrato: 'hipotecario',
    notaria: '67',
    costos_notaria: 814716,
    fecha_desembolso: '2025-12-15',
  },
  {
    codigo: 'CR014',
    tipo_inmueble: 'casa',
    valor_comercial: 450000000,
    valor_colocado: 206000000,
    ltv: 45.78,
    tasa_nominal: 1.79,
    tasa_interes_ea: 23.73,
    plazo: 60,
    tipo_liquidacion: 'anticipada',
    tipo_amortizacion: 'francesa',
    tipo_contrato: 'hipotecario',
    notaria: '67',
    costos_notaria: 10896000,
    fecha_desembolso: '2025-11-26',
  },
  {
    codigo: 'CR015',
    tipo_inmueble: 'predio rural',
    valor_comercial: 500000000,
    valor_colocado: 80000000,
    ltv: 16.00,
    tasa_nominal: 1.79,
    tasa_interes_ea: 23.73,
    plazo: 60,
    tipo_liquidacion: 'anticipada',
    tipo_amortizacion: 'francesa',
    tipo_contrato: 'hipotecario',
    notaria: '67',
    costos_notaria: 759448,
    fecha_desembolso: '2025-12-19',
  },
  {
    codigo: 'CR016',
    tipo_inmueble: 'apartamento',
    valor_comercial: 120000000,
    valor_colocado: 40000000,
    ltv: 33.33,
    tasa_nominal: 1.82,
    tasa_interes_ea: 24.16,
    plazo: 36,
    tipo_liquidacion: 'anticipada',
    tipo_amortizacion: 'francesa',
    tipo_contrato: 'hipotecario',
    notaria: '67',
    costos_notaria: 944605,
    fecha_desembolso: '2026-01-08',
  },
  {
    codigo: 'CR017',
    tipo_inmueble: 'casa',
    valor_comercial: 250000000,
    valor_colocado: 100000000,
    ltv: 40.00,
    tasa_nominal: 1.83,
    tasa_interes_ea: 24.31,
    plazo: 60,
    tipo_liquidacion: 'anticipada',
    tipo_amortizacion: 'francesa',
    tipo_contrato: 'hipotecario',
    notaria: '67',
    costos_notaria: 900292,
    fecha_desembolso: '2026-01-08',
  },
  {
    codigo: 'CR018',
    tipo_inmueble: 'apartamento',
    valor_comercial: 900000000,
    valor_colocado: 475000000,
    ltv: 52.78,
    tasa_nominal: 1.90,
    tasa_interes_ea: 25.34,
    plazo: 36,
    tipo_liquidacion: 'anticipada',
    tipo_amortizacion: 'solo_interes',
    tipo_contrato: 'retroventa',
    notaria: '67',
    costos_notaria: 18078230,
    fecha_desembolso: '2025-12-23',
  },
  {
    codigo: 'CR019',
    tipo_inmueble: 'apartamento',
    valor_comercial: 900000000,
    valor_colocado: 475000000,
    ltv: 52.78,
    tasa_nominal: 1.90,
    tasa_interes_ea: 25.34,
    plazo: 36,
    tipo_liquidacion: 'anticipada',
    tipo_amortizacion: 'solo_interes',
    tipo_contrato: 'retroventa',
    notaria: '12',
    costos_notaria: 20013275,
    fecha_desembolso: '2026-01-28',
  },
  {
    codigo: 'CR020',
    tipo_inmueble: 'casa',
    valor_comercial: 140000000,
    valor_colocado: 50000000,
    ltv: 35.71,
    tasa_nominal: 1.84,
    tasa_interes_ea: 24.46,
    plazo: 36,
    tipo_liquidacion: 'anticipada',
    tipo_amortizacion: 'francesa',
    tipo_contrato: 'hipotecario',
    notaria: '67',
    costos_notaria: 971592,
    fecha_desembolso: '2026-01-23',
  },
  {
    codigo: 'CR021',
    tipo_inmueble: 'apartamento',
    valor_comercial: 550000000,
    valor_colocado: 300000000,
    ltv: 54.55,
    tasa_nominal: 1.85,
    tasa_interes_ea: 24.60,
    plazo: 48,
    tipo_liquidacion: 'anticipada',
    tipo_amortizacion: 'solo_interes',
    tipo_contrato: 'retroventa',
    notaria: '67',
    costos_notaria: 10204595,
    fecha_desembolso: '2026-01-21',
  },
  {
    codigo: 'CR022',
    tipo_inmueble: 'casa',
    valor_comercial: 980000000,
    valor_colocado: 350000000,
    ltv: 35.71,
    tasa_nominal: 1.87,
    tasa_interes_ea: 24.90,
    plazo: 84,
    tipo_liquidacion: 'anticipada',
    tipo_amortizacion: 'francesa',
    tipo_contrato: 'hipotecario',
    notaria: '67',
    costos_notaria: 547900,
  },
  {
    codigo: 'CR023',
    tipo_inmueble: 'oficina',
    valor_comercial: 120000000,
    valor_colocado: 50000000,
    ltv: 41.67,
    tasa_nominal: 1.90,
    tasa_interes_ea: 25.34,
    plazo: 36,
    tipo_liquidacion: 'anticipada',
    tipo_amortizacion: 'solo_interes',
    tipo_contrato: 'hipotecario',
    notaria: '67',
    costos_notaria: 579537,
  },
  {
    codigo: 'CR024',
    tipo_inmueble: 'local comercial',
    valor_comercial: 1700000000,
    valor_colocado: 925000000,
    ltv: 54.41,
    tasa_nominal: 1.85,
    tasa_interes_ea: 24.60,
    plazo: 60,
    tipo_liquidacion: 'anticipada',
    tipo_amortizacion: 'solo_interes',
    tipo_contrato: 'retroventa',
    notaria: '67',
  },
  {
    codigo: 'CR025',
    tipo_inmueble: 'casa',
    valor_comercial: 220000000,
    valor_colocado: 80000000,
    ltv: 36.36,
    tasa_nominal: 1.85,
    tasa_interes_ea: 24.60,
    plazo: 36,
    tipo_liquidacion: 'anticipada',
    tipo_amortizacion: 'solo_interes',
    tipo_contrato: 'hipotecario',
    notaria: '67',
  },
  {
    codigo: 'CR026',
    tipo_inmueble: 'apartamento',
    valor_comercial: 200000000,
    valor_colocado: 67000000,
    ltv: 33.50,
    tasa_nominal: 1.80,
    tasa_interes_ea: 23.87,
    plazo: 58,
    tipo_liquidacion: 'anticipada',
    tipo_amortizacion: 'francesa',
    tipo_contrato: 'hipotecario',
    notaria: '67',
    costos_notaria: 0,
  },
  {
    codigo: 'CR027',
    tipo_inmueble: 'casa',
    valor_comercial: 150000000,
    valor_colocado: 55000000,
    ltv: 36.67,
    tasa_nominal: 1.87,
    tasa_interes_ea: 24.90,
    plazo: 72,
    tipo_liquidacion: 'anticipada',
    tipo_amortizacion: 'francesa',
    tipo_contrato: 'hipotecario',
  },
];

async function run() {
  console.log(`=== Actualizando detalles financieros de creditos ${DRY_RUN ? '(DRY RUN)' : ''} ===\n`);

  let updated = 0;
  let errors = 0;

  for (const cr of CREDITS) {
    console.log(`\n--- ${cr.codigo} ---`);

    // Find the credit
    const { data: credito, error: findErr } = await supabase
      .from('creditos')
      .select('id')
      .eq('codigo_credito', cr.codigo)
      .single();

    if (findErr || !credito) {
      console.error(`  ✗ Credito ${cr.codigo} no encontrado: ${findErr?.message}`);
      errors++;
      continue;
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      valor_comercial: cr.valor_comercial,
      valor_colocado: cr.valor_colocado,
      ltv: cr.ltv,
      tasa_nominal: cr.tasa_nominal,
      tasa_interes_ea: cr.tasa_interes_ea,
      plazo: cr.plazo,
      tipo_liquidacion: cr.tipo_liquidacion,
      tipo_amortizacion: cr.tipo_amortizacion,
      tipo_contrato: cr.tipo_contrato,
    };

    if (cr.tipo_inmueble) updateData.tipo_inmueble = cr.tipo_inmueble;
    if (cr.notaria) updateData.notaria = cr.notaria;
    if (cr.costos_notaria != null) updateData.costos_notaria = cr.costos_notaria;
    if (cr.fecha_desembolso) updateData.fecha_desembolso = cr.fecha_desembolso;

    if (DRY_RUN) {
      console.log(`  [DRY] Update: ${JSON.stringify(updateData)}`);
    } else {
      const { error: updErr } = await supabase
        .from('creditos')
        .update(updateData)
        .eq('id', credito.id);

      if (updErr) {
        console.error(`  ✗ Error actualizando: ${updErr.message}`);
        errors++;
      } else {
        console.log(`  ✓ ${cr.codigo}: $${(cr.valor_colocado / 1e6).toFixed(0)}M, ${cr.tasa_nominal}% NM, ${cr.plazo}m, ${cr.tipo_amortizacion}, ${cr.tipo_liquidacion}`);
        updated++;
      }
    }
  }

  console.log(`\n=== Resumen ${DRY_RUN ? '(DRY RUN)' : ''} ===`);
  console.log(`Creditos actualizados: ${updated}`);
  console.log(`Errores: ${errors}`);
}

run().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
