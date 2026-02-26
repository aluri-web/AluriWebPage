import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ============================================================
// PART 1: Credit detail corrections
// ============================================================
const creditFixes: Record<string, Record<string, unknown>> = {
  CR021: {
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
  },
  CR022: {
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
  },
  // CR023: only tipo_contrato fix
  CR023: {
    tipo_contrato: 'retroventa',
  },
  // CR024: only tipo_contrato fix
  CR024: {
    tipo_contrato: 'hipotecario',
  },
  // CR025: only tipo_contrato fix
  CR025: {
    tipo_contrato: 'retroventa',
  },
  CR026: {
    tipo_inmueble: 'casa',
    valor_comercial: 280000000,
    valor_colocado: 110000000,
    ltv: 39.29,
    tasa_nominal: 1.85,
    tasa_interes_ea: 24.60,
    plazo: 60,
    tipo_liquidacion: 'anticipada',
    tipo_amortizacion: 'solo_interes',
    tipo_contrato: 'hipotecario',
    notaria: '67',
  },
  CR027: {
    tipo_inmueble: 'local comercial',
    valor_comercial: 1900000000,
    valor_colocado: 1150000000,
    ltv: 60.53,
    tasa_nominal: 1.75,
    tasa_interes_ea: 23.14,
    plazo: 120,
    tipo_liquidacion: 'anticipada',
    tipo_amortizacion: 'francesa',
    tipo_contrato: 'hipotecario',
  },
};

// ============================================================
// PART 2: Inversiones corrections
// ============================================================
// Source of truth: user's spreadsheet screenshot
// monto_invertido = valor_colocado * porcentaje / 100

const inversionesFixes: Record<string, { investor: string; pct: number; monto: number }[]> = {
  CR021: [
    // valor_colocado = 350,000,000
    { investor: 'Manuel Barrera', pct: 28.57, monto: 99995000 },
    { investor: 'Carlos Mario Ruiz', pct: 21.43, monto: 75005000 },
    { investor: 'Sergio Andres Velandia', pct: 21.43, monto: 75005000 },
    { investor: 'Oscar Fabian Tarazona', pct: 28.57, monto: 99995000 },
  ],
  CR022: [
    // valor_colocado = 67,000,000
    { investor: 'Sergio Andres Velandia', pct: 100, monto: 67000000 },
  ],
  CR023: [
    // valor_colocado = 50,000,000
    { investor: 'Diego Barragan', pct: 25, monto: 12500000 },
    { investor: 'Daniel Barragan', pct: 25, monto: 12500000 },
    { investor: 'Manuel Pinilla', pct: 33.33, monto: 16665000 },
    { investor: 'Oscar Fabian Tarazona', pct: 16.67, monto: 8335000 },
  ],
  CR024: [
    // valor_colocado = 925,000,000
    { investor: 'Diego Chacon Malagon', pct: 100, monto: 925000000 },
  ],
  CR025: [
    // valor_colocado = 80,000,000
    { investor: 'Oscar Fabian Tarazona', pct: 44.32, monto: 35456000 },
    { investor: 'Daniel Barragan', pct: 8.11, monto: 6488000 },
    { investor: 'Jorge Useche Correa', pct: 21.62, monto: 17296000 },
    { investor: 'Manuel Pinilla', pct: 10.81, monto: 8648000 },
    { investor: 'Nicolas Zapata', pct: 15.14, monto: 12112000 },
  ],
  CR026: [
    // valor_colocado = 110,000,000
    { investor: 'Manuel Pinilla', pct: 75, monto: 82500000 },
    { investor: 'Oscar Fabian Tarazona', pct: 25, monto: 27500000 },
  ],
};

// ============================================================
// Helper: find or create investor profile
// ============================================================
const investorCache = new Map<string, string>(); // name -> profile id

async function getOrCreateInvestor(name: string): Promise<string> {
  const cached = investorCache.get(name);
  if (cached) return cached;

  // Search by full_name (case-insensitive)
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .ilike('full_name', name)
    .limit(1);

  if (existing && existing.length > 0) {
    investorCache.set(name, existing[0].id);
    return existing[0].id;
  }

  // Create auth user + profile
  const email = `${name.toLowerCase().replace(/\s+/g, '.')}@placeholder.aluri.co`;
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: `Aluri2025!${Math.random().toString(36).slice(2, 8)}`,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    throw new Error(`Failed to create auth user for ${name}: ${authError?.message}`);
  }

  const { error: profileError } = await supabase.from('profiles').insert({
    id: authData.user.id,
    full_name: name,
    role: 'inversionista',
  });

  if (profileError) {
    throw new Error(`Failed to create profile for ${name}: ${profileError.message}`);
  }

  console.log(`  + Created investor profile: ${name}`);
  investorCache.set(name, authData.user.id);
  return authData.user.id;
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log('=== Fix Creditos & Inversiones ===\n');

  // --- STEP 1: Fix credit details ---
  console.log('--- Step 1: Fixing credit details ---');
  for (const [code, updates] of Object.entries(creditFixes)) {
    const { error } = await supabase
      .from('creditos')
      .update(updates)
      .eq('codigo_credito', code);

    if (error) {
      console.error(`  ✗ ${code}: ${error.message}`);
    } else {
      const fields = Object.keys(updates).join(', ');
      console.log(`  ✓ ${code}: updated ${fields}`);
    }
  }

  // --- STEP 2: Fix tipo_contrato for CR021 (already done above but also need to fix retroventa → hipotecario) ---
  // Already handled in creditFixes above

  // --- STEP 3: Remove duplicate inversiones for CR015 and CR017 ---
  console.log('\n--- Step 2: Removing duplicate inversiones (CR015, CR017) ---');
  for (const code of ['CR015', 'CR017']) {
    // Get credit id
    const { data: creditData } = await supabase
      .from('creditos')
      .select('id')
      .eq('codigo_credito', code)
      .single();

    if (!creditData) {
      console.error(`  ✗ ${code}: credit not found`);
      continue;
    }

    // Get all inversiones for this credit
    const { data: invs } = await supabase
      .from('inversiones')
      .select('id, inversionista_id')
      .eq('credito_id', creditData.id)
      .order('created_at', { ascending: true });

    if (!invs || invs.length <= 1) {
      console.log(`  ${code}: no duplicates found (${invs?.length || 0} records)`);
      continue;
    }

    // Keep the first one, delete the rest
    const toDelete = invs.slice(1).map(i => i.id);
    const { error } = await supabase
      .from('inversiones')
      .delete()
      .in('id', toDelete);

    if (error) {
      console.error(`  ✗ ${code}: ${error.message}`);
    } else {
      console.log(`  ✓ ${code}: removed ${toDelete.length} duplicate(s)`);
    }
  }

  // --- STEP 4: Fix inversiones for CR021-CR026 ---
  console.log('\n--- Step 3: Fixing inversiones (CR021-CR026) ---');

  for (const [code, investors] of Object.entries(inversionesFixes)) {
    // Get credit id and estado
    const { data: creditData } = await supabase
      .from('creditos')
      .select('id, estado')
      .eq('codigo_credito', code)
      .single();

    if (!creditData) {
      console.error(`  ✗ ${code}: credit not found`);
      continue;
    }

    console.log(`\n  ${code}:`);

    // Delete existing inversiones
    const { data: existing } = await supabase
      .from('inversiones')
      .select('id')
      .eq('credito_id', creditData.id);

    if (existing && existing.length > 0) {
      // First delete any causaciones_inversionistas referencing these inversiones
      for (const inv of existing) {
        await supabase
          .from('causaciones_inversionistas')
          .delete()
          .eq('inversion_id', inv.id);
      }

      const { error: delError } = await supabase
        .from('inversiones')
        .delete()
        .eq('credito_id', creditData.id);

      if (delError) {
        console.error(`    ✗ Failed to delete old inversiones: ${delError.message}`);
        continue;
      }
      console.log(`    Deleted ${existing.length} old inversiones`);
    }

    // Create new inversiones
    for (const inv of investors) {
      const investorId = await getOrCreateInvestor(inv.investor);

      const { error: insertError } = await supabase
        .from('inversiones')
        .insert({
          credito_id: creditData.id,
          inversionista_id: investorId,
          monto_invertido: inv.monto,
          porcentaje_participacion: inv.pct,
          estado: creditData.estado,
        });

      if (insertError) {
        console.error(`    ✗ ${inv.investor} (${inv.pct}%): ${insertError.message}`);
      } else {
        console.log(`    ✓ ${inv.investor}: ${inv.pct}% → $${inv.monto.toLocaleString()}`);
      }
    }
  }

  // --- STEP 5: Summary ---
  console.log('\n\n=== Verification ===');
  const { data: allInv } = await supabase
    .from('inversiones')
    .select('credito:creditos!inner(codigo_credito), inversionista:profiles!inversionista_id(full_name), porcentaje_participacion, monto_invertido')
    .order('codigo_credito', { referencedTable: 'creditos', ascending: true });

  const grouped: Record<string, { name: string; pct: number; monto: number }[]> = {};
  for (const row of (allInv || [])) {
    const code = (row.credito as any).codigo_credito;
    if (!grouped[code]) grouped[code] = [];
    grouped[code].push({
      name: (row.inversionista as any).full_name,
      pct: row.porcentaje_participacion,
      monto: row.monto_invertido,
    });
  }

  for (const [code, investors] of Object.entries(grouped).sort()) {
    const total = investors.reduce((s, i) => s + Number(i.monto), 0);
    const pctTotal = investors.reduce((s, i) => s + i.pct, 0);
    console.log(`${code}: ${investors.length} inv, ${pctTotal.toFixed(2)}% total, $${total.toLocaleString()}`);
    for (const inv of investors) {
      console.log(`  ${inv.name}: ${inv.pct}% → $${Number(inv.monto).toLocaleString()}`);
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
