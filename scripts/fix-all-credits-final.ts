import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// =====================================================
// STEP 1: Credit details from datos_clientes.csv
// =====================================================
const creditFixes: Record<string, Record<string, unknown>> = {
  CR021: {
    tipo_inmueble: 'apartamento', valor_comercial: 550000000, valor_colocado: 300000000,
    monto_solicitado: 300000000, ltv: 54.55, tasa_nominal: 1.85, tasa_interes_ea: 24.60,
    plazo: 48, tipo_liquidacion: 'anticipada', tipo_amortizacion: 'solo_interes',
    tipo_contrato: 'retroventa', notaria: '67',
  },
  CR022: {
    tipo_inmueble: 'casa', valor_comercial: 980000000, valor_colocado: 350000000,
    monto_solicitado: 350000000, ltv: 35.71, tasa_nominal: 1.87, tasa_interes_ea: 24.90,
    plazo: 84, tipo_liquidacion: 'anticipada', tipo_amortizacion: 'francesa',
    tipo_contrato: 'hipotecario', notaria: '67',
  },
  CR023: {
    tipo_inmueble: 'oficina', valor_comercial: 120000000, valor_colocado: 50000000,
    monto_solicitado: 50000000, ltv: 41.67, tasa_nominal: 1.90, tasa_interes_ea: 25.34,
    plazo: 36, tipo_liquidacion: 'anticipada', tipo_amortizacion: 'solo_interes',
    tipo_contrato: 'hipotecario', notaria: '67',
  },
  CR024: {
    tipo_inmueble: 'local comercial', valor_comercial: 1700000000, valor_colocado: 925000000,
    monto_solicitado: 925000000, ltv: 54.41, tasa_nominal: 1.85, tasa_interes_ea: 24.60,
    plazo: 60, tipo_liquidacion: 'anticipada', tipo_amortizacion: 'solo_interes',
    tipo_contrato: 'retroventa', notaria: '67',
  },
  CR025: {
    tipo_inmueble: 'casa', valor_comercial: 220000000, valor_colocado: 80000000,
    monto_solicitado: 80000000, ltv: 36.36, tasa_nominal: 1.85, tasa_interes_ea: 24.60,
    plazo: 36, tipo_liquidacion: 'anticipada', tipo_amortizacion: 'solo_interes',
    tipo_contrato: 'hipotecario', notaria: '67',
  },
  CR026: {
    tipo_inmueble: 'apartamento', valor_comercial: 200000000, valor_colocado: 67000000,
    monto_solicitado: 67000000, ltv: 33.50, tasa_nominal: 1.80, tasa_interes_ea: 23.87,
    plazo: 58, tipo_liquidacion: 'anticipada', tipo_amortizacion: 'francesa',
    tipo_contrato: 'hipotecario', notaria: '67',
  },
  CR027: {
    tipo_inmueble: 'casa', valor_comercial: 150000000, valor_colocado: 55000000,
    monto_solicitado: 55000000, ltv: 36.67, tasa_nominal: 1.87, tasa_interes_ea: 24.90,
    plazo: 72, tipo_liquidacion: 'anticipada', tipo_amortizacion: 'francesa',
    tipo_contrato: 'hipotecario',
  },
};

// =====================================================
// STEP 2: Inversiones from datos_inversiones.csv
// Note: CR024 percentages are MISSING in CSV - will skip
// =====================================================
const inversionesFixes: Record<string, { name: string; pct: number }[]> = {
  CR021: [
    { name: 'Diego Barragan', pct: 25 },
    { name: 'Daniel Barragan', pct: 25 },
    { name: 'Manuel Pinilla', pct: 33.33 },
    { name: 'Oscar Fabian Tarazona', pct: 16.67 },
  ],
  CR022: [
    { name: 'Manuel Barrera', pct: 28.57 },
    { name: 'Carlos Mario Ruiz', pct: 21.43 },
    { name: 'Sergio Andres Velandia', pct: 21.43 },
    { name: 'Oscar Fabian Tarazona', pct: 28.57 },
  ],
  CR023: [
    { name: 'Diego Chacon Malagon', pct: 100 },
  ],
  // CR024: percentages not available in CSV - will handle separately
  CR025: [
    { name: 'Manuel Pinilla', pct: 75 },
    { name: 'Oscar Fabian Tarazona', pct: 25 },
  ],
  CR026: [
    { name: 'Sergio Andres Velandia', pct: 100 },
  ],
  CR027: [
    { name: 'Sergio Andres Velandia', pct: 80 },
    { name: 'Jonathan Cetina Cuellar', pct: 20 },
  ],
};

async function findInvestorId(name: string): Promise<string | null> {
  // Try exact match first
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name')
    .ilike('full_name', `%${name.split(' ')[0]}%`);

  if (data && data.length > 0) {
    // Try to find best match
    const exact = data.find(d => d.full_name?.toLowerCase() === name.toLowerCase());
    if (exact) return exact.id;

    // Partial match - find the one that contains most of the name parts
    const nameParts = name.toLowerCase().split(' ');
    let bestMatch = data[0];
    let bestScore = 0;

    for (const d of data) {
      const fn = (d.full_name || '').toLowerCase();
      const score = nameParts.filter(part => fn.includes(part)).length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = d;
      }
    }
    return bestMatch.id;
  }
  return null;
}

async function main() {
  console.log('=== COMPREHENSIVE FIX: CR021-CR027 ===\n');

  // ---- STEP 1: Fix credit details ----
  console.log('--- Step 1: Fix credit details ---');
  for (const [code, updates] of Object.entries(creditFixes)) {
    const { error } = await supabase.from('creditos').update(updates).eq('codigo_credito', code);
    if (error) {
      console.error(`  ✗ ${code}: ${error.message}`);
    } else {
      const vc = updates.valor_colocado as number;
      console.log(`  ✓ ${code}: ${updates.tipo_inmueble}, vc=$${vc / 1e6}M, EA=${updates.tasa_interes_ea}%, plazo=${updates.plazo}, ${updates.tipo_contrato}`);
    }
  }

  // ---- STEP 2: Fix inversiones ----
  console.log('\n--- Step 2: Fix inversiones ---');

  for (const [code, investors] of Object.entries(inversionesFixes)) {
    // Get credit id and valor_colocado
    const { data: credit } = await supabase
      .from('creditos')
      .select('id, valor_colocado, estado')
      .eq('codigo_credito', code)
      .single();

    if (!credit) {
      console.error(`  ✗ ${code}: credit not found`);
      continue;
    }

    const vc = Number(credit.valor_colocado);
    console.log(`\n  ${code} (vc=$${vc / 1e6}M):`);

    // Delete all existing inversiones for this credit
    const { data: existing } = await supabase
      .from('inversiones')
      .select('id')
      .eq('credito_id', credit.id);

    if (existing && existing.length > 0) {
      const { error: delErr } = await supabase
        .from('inversiones')
        .delete()
        .eq('credito_id', credit.id);

      if (delErr) {
        console.error(`    ✗ Error deleting existing inversiones: ${delErr.message}`);
        continue;
      }
      console.log(`    Deleted ${existing.length} existing inversiones`);
    }

    // Create new inversiones
    for (const inv of investors) {
      const investorId = await findInvestorId(inv.name);
      if (!investorId) {
        console.error(`    ✗ Investor not found: "${inv.name}"`);
        continue;
      }

      const monto = Math.round(vc * inv.pct / 100);
      const { error: insErr } = await supabase.from('inversiones').insert({
        credito_id: credit.id,
        inversionista_id: investorId,
        porcentaje_participacion: inv.pct,
        monto_invertido: monto,
        estado: 'activo',
      });

      if (insErr) {
        console.error(`    ✗ ${inv.name} (${inv.pct}%): ${insErr.message}`);
      } else {
        console.log(`    ✓ ${inv.name}: ${inv.pct}% → $${monto.toLocaleString()}`);
      }
    }
  }

  // ---- STEP 3: Handle CR024 inversiones ----
  console.log('\n--- Step 3: CR024 inversiones ---');
  console.log('  ⚠ CR024 investor percentages are missing in the CSV.');
  console.log('  Checking current state...');

  const { data: cr024 } = await supabase
    .from('creditos').select('id, valor_colocado').eq('codigo_credito', 'CR024').single();

  if (cr024) {
    const { data: cr024Invs } = await supabase
      .from('inversiones')
      .select('porcentaje_participacion, monto_invertido, inversionista:profiles!inversionista_id(full_name)')
      .eq('credito_id', cr024.id);

    // Delete existing wrong inversiones
    const { error: delErr } = await supabase
      .from('inversiones')
      .delete()
      .eq('credito_id', cr024.id);

    if (delErr) {
      console.error(`  ✗ Error deleting: ${delErr.message}`);
    } else {
      console.log(`  Deleted ${(cr024Invs || []).length} wrong inversiones.`);
      console.log('  ⚠ CR024 needs investor percentages. Expected investors: Oscar Fabian Tarazona, Daniel Barragan, Jorge Useche Correa');
    }
  }

  // ---- STEP 4: Verification ----
  console.log('\n\n=== VERIFICATION ===');
  const codes = ['CR021', 'CR022', 'CR023', 'CR024', 'CR025', 'CR026', 'CR027'];

  for (const code of codes) {
    const { data: c } = await supabase
      .from('creditos')
      .select('id, codigo_credito, tipo_inmueble, valor_comercial, valor_colocado, monto_solicitado, tasa_interes_ea, plazo, tipo_contrato, tipo_amortizacion')
      .eq('codigo_credito', code).single();

    if (!c) { console.log(`${code}: NOT FOUND`); continue; }

    const { data: invs } = await supabase
      .from('inversiones')
      .select('inversionista:profiles!inversionista_id(full_name), porcentaje_participacion, monto_invertido')
      .eq('credito_id', c.id);

    const total = (invs || []).reduce((s, i) => s + Number(i.monto_invertido), 0);
    console.log(`\n${code}: ${c.tipo_inmueble}, vc=$${c.valor_comercial / 1e6}M/$${c.valor_colocado / 1e6}M, EA=${c.tasa_interes_ea}%, plazo=${c.plazo}, ${c.tipo_amortizacion}, ${c.tipo_contrato}`);
    console.log(`  monto_solicitado=$${c.monto_solicitado / 1e6}M, inv_total=$${(total / 1e6).toFixed(1)}M`);
    for (const i of invs || []) {
      console.log(`  ${(i.inversionista as any).full_name}: ${i.porcentaje_participacion}% → $${Number(i.monto_invertido).toLocaleString()}`);
    }
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
