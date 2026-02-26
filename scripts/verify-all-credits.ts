import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Expected data from datos_clientes.csv (the authoritative source)
const expectedCredits: Record<string, Record<string, unknown>> = {
  CR001: { tipo_inmueble: 'casa', valor_comercial: 450000000, valor_colocado: 200000000, monto_solicitado: 200000000, ltv: 44.44, tasa_nominal: 2.00, tasa_interes_ea: 26.82, plazo: 84, tipo_liquidacion: 'anticipada', tipo_amortizacion: 'capital_e_intereses', tipo_contrato: 'hipotecario', notaria: '8' },
  CR002: { tipo_inmueble: 'casa', valor_comercial: 380000000, valor_colocado: 220000000, monto_solicitado: 220000000, ltv: 57.89, tasa_nominal: 2.00, tasa_interes_ea: 26.82, plazo: 120, tipo_liquidacion: 'anticipada', tipo_amortizacion: 'capital_e_intereses', tipo_contrato: 'hipotecario', notaria: '44' },
  CR003: { tipo_inmueble: 'casa', valor_comercial: 220000000, valor_colocado: 50000000, monto_solicitado: 50000000, ltv: 22.73, tasa_nominal: 1.80, tasa_interes_ea: 23.87, plazo: 72, tipo_liquidacion: 'anticipada', tipo_amortizacion: 'capital_e_intereses', tipo_contrato: 'hipotecario', notaria: '44' },
  CR004: { tipo_inmueble: 'casa', valor_comercial: 305000000, valor_colocado: 100000000, monto_solicitado: 100000000, ltv: 32.79, tasa_nominal: 2.00, tasa_interes_ea: 26.82, plazo: 60, tipo_liquidacion: 'anticipada', tipo_amortizacion: 'solo_interes', tipo_contrato: 'hipotecario', notaria: '20' },
  CR005: { tipo_inmueble: 'apartamento', valor_comercial: 350000000, valor_colocado: 120000000, monto_solicitado: 120000000, ltv: 34.29, tasa_nominal: 2.50, tasa_interes_ea: 34.49, plazo: 24, tipo_liquidacion: 'anticipada', tipo_amortizacion: 'solo_interes', tipo_contrato: 'hipotecario', notaria: '20' },
  CR006: { tipo_inmueble: 'lote', valor_comercial: 1950000000, valor_colocado: 143000000, monto_solicitado: 143000000, ltv: 7.33, tasa_nominal: 1.90, tasa_interes_ea: 25.34, plazo: 48, tipo_liquidacion: 'vencida', tipo_amortizacion: 'capital_e_intereses', tipo_contrato: 'hipotecario', notaria: '20' },
  CR007: { valor_comercial: 190000000, valor_colocado: 35000000, monto_solicitado: 35000000, ltv: 18.42, tasa_nominal: 1.95, tasa_interes_ea: 26.08, plazo: 36, tipo_liquidacion: 'anticipada', tipo_amortizacion: 'solo_interes', tipo_contrato: 'hipotecario', notaria: '44' },
  CR008: { valor_comercial: 400000000, valor_colocado: 80000000, monto_solicitado: 80000000, ltv: 20.00, tasa_nominal: 2.00, tasa_interes_ea: 26.82, plazo: 120, tipo_liquidacion: 'anticipada', tipo_amortizacion: 'capital_e_intereses', tipo_contrato: 'hipotecario', notaria: '3' },
  CR009: { tipo_inmueble: 'oficina', valor_comercial: 450000000, valor_colocado: 100000000, monto_solicitado: 100000000, ltv: 22.22, tasa_nominal: 1.80, tasa_interes_ea: 23.87, plazo: 12, tipo_liquidacion: 'anticipada', tipo_amortizacion: 'solo_interes', tipo_contrato: 'hipotecario', notaria: '3' },
  CR010: { tipo_inmueble: 'casa', valor_comercial: 400000000, valor_colocado: 160000000, monto_solicitado: 160000000, ltv: 40.00, tasa_nominal: 1.80, tasa_interes_ea: 23.87, plazo: 120, tipo_liquidacion: 'anticipada', tipo_amortizacion: 'capital_e_intereses', tipo_contrato: 'hipotecario', notaria: '3' },
  CR011: { tipo_inmueble: 'predio rural', valor_comercial: 500000000, valor_colocado: 200000000, monto_solicitado: 200000000, ltv: 40.00, tasa_nominal: 1.82, tasa_interes_ea: 24.16, plazo: 72, tipo_liquidacion: 'anticipada', tipo_amortizacion: 'capital_e_intereses', tipo_contrato: 'hipotecario', notaria: '67' },
  CR012: { tipo_inmueble: 'apartamento', valor_comercial: 200000000, valor_colocado: 40000000, monto_solicitado: 40000000, ltv: 20.00, tasa_nominal: 1.80, tasa_interes_ea: 23.87, plazo: 60, tipo_liquidacion: 'anticipada', tipo_amortizacion: 'capital_e_intereses', tipo_contrato: 'hipotecario', notaria: '67' },
  CR013: { tipo_inmueble: 'casa', valor_comercial: 320000000, valor_colocado: 140000000, monto_solicitado: 140000000, ltv: 43.75, tasa_nominal: 1.82, tasa_interes_ea: 24.16, plazo: 72, tipo_liquidacion: 'anticipada', tipo_amortizacion: 'capital_e_intereses', tipo_contrato: 'hipotecario', notaria: '67' },
  CR014: { tipo_inmueble: 'casa', valor_comercial: 450000000, valor_colocado: 206000000, monto_solicitado: 206000000, ltv: 45.78, tasa_nominal: 1.79, tasa_interes_ea: 23.73, plazo: 60, tipo_liquidacion: 'anticipada', tipo_amortizacion: 'capital_e_intereses', tipo_contrato: 'hipotecario', notaria: '67' },
  CR015: { tipo_inmueble: 'predio rural', valor_comercial: 500000000, valor_colocado: 80000000, monto_solicitado: 80000000, ltv: 16.00, tasa_nominal: 1.79, tasa_interes_ea: 23.73, plazo: 60, tipo_liquidacion: 'anticipada', tipo_amortizacion: 'capital_e_intereses', tipo_contrato: 'hipotecario', notaria: '67' },
  CR016: { tipo_inmueble: 'apartamento', valor_comercial: 120000000, valor_colocado: 40000000, monto_solicitado: 40000000, ltv: 33.33, tasa_nominal: 1.82, tasa_interes_ea: 24.16, plazo: 36, tipo_liquidacion: 'anticipada', tipo_amortizacion: 'capital_e_intereses', tipo_contrato: 'hipotecario', notaria: '67' },
  CR017: { tipo_inmueble: 'casa', valor_comercial: 250000000, valor_colocado: 100000000, monto_solicitado: 100000000, ltv: 40.00, tasa_nominal: 1.83, tasa_interes_ea: 24.31, plazo: 60, tipo_liquidacion: 'anticipada', tipo_amortizacion: 'capital_e_intereses', tipo_contrato: 'hipotecario', notaria: '67' },
  CR018: { tipo_inmueble: 'apartamento', valor_comercial: 900000000, valor_colocado: 475000000, monto_solicitado: 475000000, ltv: 52.78, tasa_nominal: 1.90, tasa_interes_ea: 25.34, plazo: 36, tipo_liquidacion: 'anticipada', tipo_amortizacion: 'solo_interes', tipo_contrato: 'retroventa', notaria: '67' },
  CR019: { tipo_inmueble: 'apartamento', valor_comercial: 900000000, valor_colocado: 475000000, monto_solicitado: 475000000, ltv: 52.78, tasa_nominal: 1.90, tasa_interes_ea: 25.34, plazo: 36, tipo_liquidacion: 'anticipada', tipo_amortizacion: 'solo_interes', tipo_contrato: 'retroventa', notaria: '12' },
  CR020: { tipo_inmueble: 'casa', valor_comercial: 140000000, valor_colocado: 50000000, monto_solicitado: 50000000, ltv: 35.71, tasa_nominal: 1.84, tasa_interes_ea: 24.46, plazo: 36, tipo_liquidacion: 'anticipada', tipo_amortizacion: 'capital_e_intereses', tipo_contrato: 'hipotecario', notaria: '67' },
  CR021: { tipo_inmueble: 'apartamento', valor_comercial: 550000000, valor_colocado: 300000000, monto_solicitado: 300000000, ltv: 54.55, tasa_nominal: 1.85, tasa_interes_ea: 24.60, plazo: 48, tipo_liquidacion: 'anticipada', tipo_amortizacion: 'solo_interes', tipo_contrato: 'retroventa', notaria: '67' },
  CR022: { tipo_inmueble: 'casa', valor_comercial: 980000000, valor_colocado: 350000000, monto_solicitado: 350000000, ltv: 35.71, tasa_nominal: 1.87, tasa_interes_ea: 24.90, plazo: 84, tipo_liquidacion: 'anticipada', tipo_amortizacion: 'capital_e_intereses', tipo_contrato: 'hipotecario', notaria: '67' },
  CR023: { tipo_inmueble: 'oficina', valor_comercial: 120000000, valor_colocado: 50000000, monto_solicitado: 50000000, ltv: 41.67, tasa_nominal: 1.90, tasa_interes_ea: 25.34, plazo: 36, tipo_liquidacion: 'anticipada', tipo_amortizacion: 'solo_interes', tipo_contrato: 'hipotecario', notaria: '67' },
  CR024: { tipo_inmueble: 'local comercial', valor_comercial: 1700000000, valor_colocado: 925000000, monto_solicitado: 925000000, ltv: 54.41, tasa_nominal: 1.85, tasa_interes_ea: 24.60, plazo: 60, tipo_liquidacion: 'anticipada', tipo_amortizacion: 'solo_interes', tipo_contrato: 'retroventa', notaria: '67' },
  CR025: { tipo_inmueble: 'casa', valor_comercial: 220000000, valor_colocado: 80000000, monto_solicitado: 80000000, ltv: 36.36, tasa_nominal: 1.85, tasa_interes_ea: 24.60, plazo: 36, tipo_liquidacion: 'anticipada', tipo_amortizacion: 'solo_interes', tipo_contrato: 'hipotecario', notaria: '67' },
  CR026: { tipo_inmueble: 'apartamento', valor_comercial: 200000000, valor_colocado: 67000000, monto_solicitado: 67000000, ltv: 33.50, tasa_nominal: 1.80, tasa_interes_ea: 23.87, plazo: 58, tipo_liquidacion: 'anticipada', tipo_amortizacion: 'capital_e_intereses', tipo_contrato: 'hipotecario', notaria: '67' },
  CR027: { tipo_inmueble: 'casa', valor_comercial: 150000000, valor_colocado: 55000000, monto_solicitado: 55000000, ltv: 36.67, tasa_nominal: 1.87, tasa_interes_ea: 24.90, plazo: 72, tipo_liquidacion: 'anticipada', tipo_amortizacion: 'capital_e_intereses', tipo_contrato: 'hipotecario' },
};

// Expected inversiones from datos_inversiones.csv
const expectedInversiones: Record<string, { name: string; pct: number }[]> = {
  CR001: [{ name: 'Ana Lucia Contreras', pct: 100 }],
  CR002: [{ name: 'Ana Lucia Contreras', pct: 100 }],
  CR003: [{ name: 'Juan Pablo Malaver', pct: 50 }, { name: 'Sergio Andres Velandia', pct: 50 }],
  CR004: [{ name: 'Oscar Mauricio Zapata', pct: 100 }],
  CR005: [{ name: 'Oscar Mauricio Zapata', pct: 50 }, { name: 'Juan Pablo Malaver', pct: 50 }],
  CR006: [{ name: 'Oscar Mauricio Zapata', pct: 50 }, { name: 'Juan Pablo Malaver', pct: 50 }],
  CR007: [{ name: 'Sergio Andres Velandia', pct: 100 }],
  CR008: [{ name: 'Sergio Andres Velandia', pct: 100 }],
  CR009: [{ name: 'Ana Lucia Contreras', pct: 100 }],
  CR010: [{ name: 'Sergio Andres Velandia', pct: 33.33 }, { name: 'Juan Pablo Malaver', pct: 33.33 }, { name: 'Luis Miguel Centanaro', pct: 33.33 }],
  CR011: [{ name: 'Fanny Asencio Serna', pct: 100 }],
  CR012: [{ name: 'Sergio Andres Velandia', pct: 100 }],
  CR013: [{ name: 'Fanny Asencio Serna', pct: 100 }],
  CR014: [{ name: 'Fanny Asencio Serna', pct: 100 }],
  CR015: [{ name: 'Carlos Eduardo Londoño', pct: 100 }],
  CR016: [{ name: 'Camila Manrique', pct: 100 }],
  CR017: [{ name: 'Javier arnulfo rivera', pct: 100 }],
  CR018: [{ name: 'Oscar Fabian Tarazona', pct: 50 }, { name: 'German Andres Cajamarca Castro', pct: 50 }],
  CR019: [{ name: 'Edgar Orlando Velasco', pct: 50 }, { name: 'Hector Hernandez Parra', pct: 50 }],
  CR020: [{ name: 'Sergio Andres Velandia', pct: 100 }],
  CR021: [{ name: 'Diego Barragan', pct: 25 }, { name: 'Daniel Barragan', pct: 25 }, { name: 'Manuel Pinilla', pct: 33.33 }, { name: 'Oscar Fabian Tarazona', pct: 16.67 }],
  CR022: [{ name: 'Manuel Barrera', pct: 28.57 }, { name: 'Carlos Mario Ruiz', pct: 21.43 }, { name: 'Sergio Andres Velandia', pct: 21.43 }, { name: 'Oscar Fabian Tarazona', pct: 28.57 }],
  CR023: [{ name: 'Diego Chacon Malagon', pct: 100 }],
  // CR024: percentages not specified in CSV - Oscar Fabian Tarazona, Daniel Barragan, Jorge Useche Correa
  CR025: [{ name: 'Manuel Pinilla', pct: 75 }, { name: 'Oscar Fabian Tarazona', pct: 25 }],
  CR026: [{ name: 'Sergio Andres Velandia', pct: 100 }],
  CR027: [{ name: 'Sergio Andres Velandia', pct: 80 }, { name: 'Jonathan Cetina Cuellar', pct: 20 }],
};

const fieldsToCheck = [
  'tipo_inmueble', 'valor_comercial', 'valor_colocado', 'monto_solicitado',
  'ltv', 'tasa_nominal', 'tasa_interes_ea', 'plazo',
  'tipo_liquidacion', 'tipo_amortizacion', 'tipo_contrato', 'notaria'
];

function fmt(v: unknown): string {
  if (typeof v === 'number' && v >= 1000000) return `$${(v / 1e6).toFixed(1)}M`;
  return String(v ?? 'null');
}

function normalize(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).toLowerCase().trim();
}

async function main() {
  console.log('=== FULL CREDIT VERIFICATION ===\n');

  const { data: credits, error } = await supabase
    .from('creditos')
    .select('*')
    .order('codigo_credito');

  if (error) { console.error('Error:', error.message); return; }

  let totalIssues = 0;

  for (const credit of credits || []) {
    const code = credit.codigo_credito;
    const expected = expectedCredits[code];

    if (!expected) {
      console.log(`${code}: No expected data in CSV (skipping)`);
      continue;
    }

    const issues: string[] = [];

    for (const field of fieldsToCheck) {
      const dbVal = credit[field];
      const expVal = expected[field];

      if (expVal === undefined) continue; // field not specified in expected

      const dbNorm = normalize(dbVal);
      const expNorm = normalize(expVal);

      // For numeric comparisons, use tolerance
      if (typeof expVal === 'number') {
        const dbNum = Number(dbVal);
        if (Math.abs(dbNum - (expVal as number)) > 0.02) {
          issues.push(`  ${field}: DB=${fmt(dbVal)} Expected=${fmt(expVal)}`);
        }
      } else if (dbNorm !== expNorm) {
        issues.push(`  ${field}: DB="${dbVal}" Expected="${expVal}"`);
      }
    }

    if (issues.length > 0) {
      console.log(`\n❌ ${code} — ${issues.length} mismatches:`);
      issues.forEach(i => console.log(i));
      totalIssues += issues.length;
    } else {
      console.log(`✅ ${code} — OK`);
    }
  }

  // Now check inversiones
  console.log('\n\n=== INVERSIONES VERIFICATION ===\n');

  for (const code of Object.keys(expectedInversiones).sort()) {
    const { data: creditRow } = await supabase
      .from('creditos').select('id, valor_colocado').eq('codigo_credito', code).single();
    if (!creditRow) { console.log(`${code}: credit not found`); continue; }

    const { data: invs } = await supabase
      .from('inversiones')
      .select('porcentaje_participacion, monto_invertido, inversionista:profiles!inversionista_id(full_name)')
      .eq('credito_id', creditRow.id);

    const expInvs = expectedInversiones[code];
    const dbInvs = (invs || []).map(i => ({
      name: (i.inversionista as any)?.full_name || 'unknown',
      pct: Number(i.porcentaje_participacion),
      monto: Number(i.monto_invertido),
    }));

    // Check count
    if (dbInvs.length !== expInvs.length) {
      console.log(`❌ ${code}: DB has ${dbInvs.length} investors, expected ${expInvs.length}`);
      console.log(`   DB: ${dbInvs.map(i => `${i.name} ${i.pct}%`).join(', ')}`);
      console.log(`   Expected: ${expInvs.map(i => `${i.name} ${i.pct}%`).join(', ')}`);
      totalIssues++;
      continue;
    }

    // Check each investor
    let invOk = true;
    for (const exp of expInvs) {
      const match = dbInvs.find(d => d.name.toLowerCase().includes(exp.name.toLowerCase().split(' ')[0]));
      if (!match) {
        console.log(`❌ ${code}: Missing investor "${exp.name}"`);
        invOk = false;
        totalIssues++;
      } else if (Math.abs(match.pct - exp.pct) > 0.02) {
        console.log(`❌ ${code}: ${match.name} has ${match.pct}%, expected ${exp.pct}%`);
        invOk = false;
        totalIssues++;
      } else {
        // Check monto_invertido = valor_colocado * pct / 100
        const expectedMonto = Math.round(creditRow.valor_colocado * match.pct / 100);
        if (Math.abs(match.monto - expectedMonto) > 1) {
          console.log(`❌ ${code}: ${match.name} monto=${fmt(match.monto)}, expected=${fmt(expectedMonto)} (vc=${fmt(creditRow.valor_colocado)} * ${match.pct}%)`);
          invOk = false;
          totalIssues++;
        }
      }
    }

    if (invOk) {
      console.log(`✅ ${code}: ${dbInvs.map(i => `${i.name} ${i.pct}% $${(i.monto/1e6).toFixed(1)}M`).join(', ')}`);
    }
  }

  console.log(`\n\n=== SUMMARY: ${totalIssues} total issues found ===`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
