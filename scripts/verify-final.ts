import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const raw = fs.readFileSync('docs/colocaciones 2026-02-26.csv', 'latin1');
const lines = raw.split('\n').filter(l => l.trim().length > 0);

function parseMoney(s: string): number {
  return Number(s.replace(/[$,]/g, '').trim()) || 0;
}
function parsePct(s: string): number {
  return Number(s.replace('%', '').trim()) || 0;
}
function mapAmort(s: string): string {
  return s.trim().toLowerCase().startsWith('solo') ? 'solo_interes' : 'francesa';
}
function mapContrato(s: string): string {
  return s.trim().toLowerCase().includes('retroventa') ? 'retroventa' : 'hipotecario';
}
function mapInmueble(s: string): string {
  const l = s.trim().toLowerCase();
  if (!l) return '';
  if (l.includes('predio')) return 'predio rural';
  if (l.includes('local')) return 'local comercial';
  return l;
}

let issues = 0;

async function main() {
  console.log('=== FINAL VERIFICATION: DB vs CSV ===\n');

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(';');
    const codigo = cols[0]?.trim();
    if (!codigo || !codigo.startsWith('CR')) continue;

    const { data: c } = await supabase
      .from('creditos')
      .select('*')
      .eq('codigo_credito', codigo)
      .single();

    if (!c) {
      console.log(`⚠ ${codigo}: NOT IN DB`);
      issues++;
      continue;
    }

    const checks: string[] = [];

    const csvInmueble = mapInmueble(cols[21] || '');
    if (csvInmueble && (c.tipo_inmueble || '').toLowerCase() !== csvInmueble) {
      checks.push(`tipo_inmueble: DB="${c.tipo_inmueble}" CSV="${csvInmueble}"`);
    }

    const csvVC = parseMoney(cols[22] || '');
    if (csvVC && Math.abs(c.valor_comercial - csvVC) > 1) {
      checks.push(`valor_comercial: DB=$${c.valor_comercial/1e6}M CSV=$${csvVC/1e6}M`);
    }

    const csvVCol = parseMoney(cols[23] || '');
    if (csvVCol && Math.abs(c.valor_colocado - csvVCol) > 1) {
      checks.push(`valor_colocado: DB=$${c.valor_colocado/1e6}M CSV=$${csvVCol/1e6}M`);
    }

    if (csvVCol && Math.abs(c.monto_solicitado - csvVCol) > 1) {
      checks.push(`monto_solicitado: DB=$${c.monto_solicitado/1e6}M CSV=$${csvVCol/1e6}M`);
    }

    const csvTN = parsePct(cols[30] || '');
    if (csvTN && Math.abs(c.tasa_nominal - csvTN) > 0.01) {
      checks.push(`tasa_nominal: DB=${c.tasa_nominal} CSV=${csvTN}`);
    }

    const csvEA = parsePct(cols[31] || '');
    if (csvEA && Math.abs(c.tasa_interes_ea - csvEA) > 0.01) {
      checks.push(`tasa_interes_ea: DB=${c.tasa_interes_ea} CSV=${csvEA}`);
    }

    const csvPlazo = Number(cols[32]?.trim()) || 0;
    if (csvPlazo && c.plazo !== csvPlazo) {
      checks.push(`plazo: DB=${c.plazo} CSV=${csvPlazo}`);
    }

    const csvAmort = mapAmort(cols[35] || '');
    if (c.tipo_amortizacion !== csvAmort) {
      checks.push(`tipo_amortizacion: DB="${c.tipo_amortizacion}" CSV="${csvAmort}"`);
    }

    const csvContrato = mapContrato(cols[55] || '');
    if (c.tipo_contrato !== csvContrato) {
      checks.push(`tipo_contrato: DB="${c.tipo_contrato}" CSV="${csvContrato}"`);
    }

    // Check inversiones
    const csvInvs: { name: string; pct: number }[] = [];
    for (let j = 0; j < 5; j++) {
      const name = (cols[10 + j * 2] || '').trim();
      const pct = parsePct(cols[11 + j * 2] || '');
      if (name && pct > 0) csvInvs.push({ name, pct });
    }

    const { data: dbInvs } = await supabase
      .from('inversiones')
      .select('porcentaje_participacion, monto_invertido, inversionista:profiles!inversionista_id(full_name)')
      .eq('credito_id', c.id);

    const dbInvList = (dbInvs || []).map(inv => ({
      name: (inv.inversionista as any)?.full_name || '',
      pct: Number(inv.porcentaje_participacion),
      monto: Number(inv.monto_invertido),
    }));

    let invOk = dbInvList.length === csvInvs.length;
    if (invOk) {
      for (const csv of csvInvs) {
        const match = dbInvList.find(d => {
          const parts = csv.name.toLowerCase().split(' ').filter(p => p.length > 2);
          return parts.filter(p => d.name.toLowerCase().includes(p)).length >= Math.min(2, parts.length);
        });
        if (!match || Math.abs(match.pct - csv.pct) > 0.02) {
          invOk = false;
          break;
        }
        const expectedMonto = Math.round(csvVCol * csv.pct / 100);
        if (Math.abs(match.monto - expectedMonto) > 1) {
          invOk = false;
          break;
        }
      }
    }

    if (!invOk) {
      checks.push(`inversiones: DB=[${dbInvList.map(d => `${d.name} ${d.pct}%`).join(', ')}] CSV=[${csvInvs.map(c => `${c.name} ${c.pct}%`).join(', ')}]`);
    }

    if (checks.length > 0) {
      console.log(`❌ ${codigo} — ${checks.length} issues:`);
      checks.forEach(ch => console.log(`   ${ch}`));
      issues += checks.length;
    } else {
      const invStr = dbInvList.map(d => `${d.name} ${d.pct}%`).join(', ');
      console.log(`✅ ${codigo}: ${c.tipo_inmueble || '?'}, $${c.valor_colocado/1e6}M, EA=${c.tasa_interes_ea}%, ${c.tipo_amortizacion}, ${c.tipo_contrato} | ${invStr}`);
    }
  }

  console.log(`\n=== ${issues === 0 ? 'ALL OK!' : `${issues} issues found`} ===`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
