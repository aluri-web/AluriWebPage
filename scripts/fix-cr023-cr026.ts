import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const creditFixes: Record<string, Record<string, unknown>> = {
  CR023: {
    tipo_inmueble: 'apartamento', valor_comercial: 550000000, valor_colocado: 300000000,
    monto_solicitado: 300000000, ltv: 54.55, tasa_nominal: 1.85, tasa_interes_ea: 24.60,
    plazo: 48, tipo_liquidacion: 'anticipada', tipo_amortizacion: 'solo_interes',
    tipo_contrato: 'retroventa', notaria: '67',
  },
  CR024: {
    tipo_inmueble: 'oficina', valor_comercial: 120000000, valor_colocado: 50000000,
    monto_solicitado: 50000000, ltv: 41.67, tasa_nominal: 1.90, tasa_interes_ea: 25.34,
    plazo: 36, tipo_liquidacion: 'anticipada', tipo_amortizacion: 'solo_interes',
    tipo_contrato: 'hipotecario', notaria: '67',
  },
  CR025: {
    tipo_inmueble: 'local comercial', valor_comercial: 1700000000, valor_colocado: 925000000,
    monto_solicitado: 925000000, ltv: 54.41, tasa_nominal: 1.85, tasa_interes_ea: 24.60,
    plazo: 60, tipo_liquidacion: 'anticipada', tipo_amortizacion: 'solo_interes',
    tipo_contrato: 'retroventa', notaria: '67',
  },
  CR026: {
    tipo_inmueble: 'casa', valor_comercial: 220000000, valor_colocado: 80000000,
    monto_solicitado: 80000000, ltv: 36.36, tasa_nominal: 1.85, tasa_interes_ea: 24.60,
    plazo: 36, tipo_liquidacion: 'anticipada', tipo_amortizacion: 'solo_interes',
    tipo_contrato: 'hipotecario', notaria: '67',
  },
};

// New valor_colocado for recalculating monto_invertido
const vcMap: Record<string, number> = {
  CR023: 300000000,
  CR024: 50000000,
  CR025: 925000000,
  CR026: 80000000,
};

async function main() {
  console.log('=== Fix CR023-CR026 ===\n');

  // STEP 1: Fix credit details
  console.log('--- Step 1: Credit details ---');
  for (const [code, updates] of Object.entries(creditFixes)) {
    const { error } = await supabase.from('creditos').update(updates).eq('codigo_credito', code);
    if (error) {
      console.error(`  ✗ ${code}: ${error.message}`);
    } else {
      const vc = updates.valor_colocado as number;
      console.log(`  ✓ ${code}: vc=${vc / 1e6}M, EA=${updates.tasa_interes_ea}%, plazo=${updates.plazo}`);
    }
  }

  // STEP 2: Fix inversiones monto_invertido
  console.log('\n--- Step 2: Inversiones monto_invertido ---');
  for (const [code, vc] of Object.entries(vcMap)) {
    const { data: credit } = await supabase
      .from('creditos').select('id').eq('codigo_credito', code).single();
    if (!credit) { console.error(`  ✗ ${code}: not found`); continue; }

    const { data: invs } = await supabase
      .from('inversiones')
      .select('id, porcentaje_participacion, inversionista:profiles!inversionista_id(full_name)')
      .eq('credito_id', credit.id);

    console.log(`  ${code} (vc=${vc / 1e6}M):`);
    for (const inv of invs || []) {
      const newMonto = Math.round(vc * inv.porcentaje_participacion / 100);
      const { error } = await supabase
        .from('inversiones').update({ monto_invertido: newMonto }).eq('id', inv.id);
      const name = (inv.inversionista as any).full_name;
      if (error) {
        console.error(`    ✗ ${name}: ${error.message}`);
      } else {
        console.log(`    ✓ ${name}: ${inv.porcentaje_participacion}% → $${newMonto.toLocaleString()}`);
      }
    }
  }

  // STEP 3: Verification
  console.log('\n=== Verification ===');
  for (const code of ['CR023', 'CR024', 'CR025', 'CR026']) {
    const { data: c } = await supabase
      .from('creditos')
      .select('codigo_credito, valor_colocado, monto_solicitado, tasa_interes_ea, plazo, tipo_inmueble, tipo_contrato')
      .eq('codigo_credito', code).single();

    const { data: credit } = await supabase
      .from('creditos').select('id').eq('codigo_credito', code).single();

    const { data: invs } = await supabase
      .from('inversiones')
      .select('inversionista:profiles!inversionista_id(full_name), porcentaje_participacion, monto_invertido')
      .eq('credito_id', credit!.id);

    const total = (invs || []).reduce((s, i) => s + Number(i.monto_invertido), 0);
    console.log(`${code}: ${c!.tipo_inmueble}, vc=$${(c!.valor_colocado / 1e6)}M, EA=${c!.tasa_interes_ea}%, plazo=${c!.plazo}, ${c!.tipo_contrato}, inv_total=$${total.toLocaleString()}`);
    for (const i of invs || []) {
      console.log(`  ${(i.inversionista as any).full_name}: ${i.porcentaje_participacion}% → $${Number(i.monto_invertido).toLocaleString()}`);
    }
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
