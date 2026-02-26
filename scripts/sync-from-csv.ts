import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// =====================================================
// Parse the new CSV
// =====================================================
const CSV_PATH = 'docs/colocaciones 2026-02-26.csv';
const raw = fs.readFileSync(CSV_PATH, 'latin1'); // handle special chars
const lines = raw.split('\n').filter(l => l.trim().length > 0);
const header = lines[0].split(';');

function parseMoney(s: string): number {
  // "$450,000,000" → 450000000
  return Number(s.replace(/[$,]/g, '').trim()) || 0;
}

function parsePct(s: string): number {
  // "44.44%" → 44.44
  return Number(s.replace('%', '').trim()) || 0;
}

function mapTipoAmortizacion(s: string): string {
  const lower = s.trim().toLowerCase();
  if (lower.includes('solo') || lower.includes('interes')) return 'solo_interes';
  return 'francesa'; // "Capital e intereses" → francesa
}

function mapTipoLiquidacion(s: string): string {
  return s.trim().toLowerCase() === 'vencida' ? 'vencida' : 'anticipada';
}

function mapTipoContrato(s: string): string {
  return s.trim().toLowerCase().includes('retroventa') ? 'retroventa' : 'hipotecario';
}

function mapTipoInmueble(s: string): string {
  const lower = s.trim().toLowerCase();
  if (!lower) return '';
  if (lower.includes('predio')) return 'predio rural';
  if (lower.includes('local')) return 'local comercial';
  return lower; // casa, apartamento, oficina, lote
}

interface CsvCredit {
  codigo: string;
  estado_csv: string;
  cedula_deudor1: string;
  deudor1: string;
  telefono: string;
  email: string;
  direccion: string;
  ciudad: string;
  cedula_deudor2: string;
  deudor2: string;
  investors: { name: string; pct: number }[];
  tipo_inmueble: string;
  valor_comercial: number;
  valor_colocado: number;
  ltv: number;
  tasa_nominal: number;
  tasa_interes_ea: number;
  plazo: number;
  tipo_liquidacion: string;
  tipo_amortizacion: string;
  notaria: string;
  tipo_contrato: string;
}

const csvCredits: CsvCredit[] = [];

for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(';');
  const codigo = cols[0]?.trim();
  if (!codigo || !codigo.startsWith('CR')) continue;

  // Parse investors (cols 10-19, pairs of name+pct)
  const investors: { name: string; pct: number }[] = [];
  for (let j = 0; j < 5; j++) {
    const name = (cols[10 + j * 2] || '').trim();
    const pct = parsePct(cols[11 + j * 2] || '');
    if (name && pct > 0) {
      investors.push({ name, pct });
    }
  }

  csvCredits.push({
    codigo,
    estado_csv: cols[1]?.trim() || '',
    cedula_deudor1: cols[2]?.trim() || '',
    deudor1: cols[3]?.trim() || '',
    telefono: cols[4]?.trim() || '',
    email: cols[5]?.trim() || '',
    direccion: cols[6]?.trim() || '',
    ciudad: cols[7]?.trim() || '',
    cedula_deudor2: cols[8]?.trim() || '',
    deudor2: cols[9]?.trim() || '',
    investors,
    tipo_inmueble: mapTipoInmueble(cols[21] || ''),
    valor_comercial: parseMoney(cols[22] || ''),
    valor_colocado: parseMoney(cols[23] || ''),
    ltv: parsePct(cols[24] || ''),
    tasa_nominal: parsePct(cols[30] || ''),
    tasa_interes_ea: parsePct(cols[31] || ''),
    plazo: Number(cols[32]?.trim()) || 0,
    tipo_liquidacion: mapTipoLiquidacion(cols[34] || ''),
    tipo_amortizacion: mapTipoAmortizacion(cols[35] || ''),
    notaria: cols[37]?.trim() || '',
    tipo_contrato: mapTipoContrato(cols[55] || ''),
  });
}

console.log(`Parsed ${csvCredits.length} credits from CSV\n`);

// =====================================================
// Investor name matching
// =====================================================
let profilesCache: { id: string; full_name: string }[] = [];

async function loadProfiles() {
  const { data } = await supabase.from('profiles').select('id, full_name');
  profilesCache = data || [];
}

function findInvestorId(name: string): string | null {
  // Exact match first
  const exact = profilesCache.find(p => p.full_name?.toLowerCase() === name.toLowerCase());
  if (exact) return exact.id;

  // Partial match - most name parts matching
  const nameParts = name.toLowerCase().split(' ').filter(p => p.length > 2);
  let bestMatch: typeof profilesCache[0] | null = null;
  let bestScore = 0;

  for (const p of profilesCache) {
    const fn = (p.full_name || '').toLowerCase();
    const score = nameParts.filter(part => fn.includes(part)).length;
    if (score > bestScore && score >= 2) {
      bestScore = score;
      bestMatch = p;
    }
  }

  // If only 1-word match needed (single word names)
  if (!bestMatch && nameParts.length <= 2) {
    for (const p of profilesCache) {
      const fn = (p.full_name || '').toLowerCase();
      const score = nameParts.filter(part => fn.includes(part)).length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = p;
      }
    }
  }

  return bestMatch?.id || null;
}

// =====================================================
// Main sync
// =====================================================
const fieldsToSync = [
  'tipo_inmueble', 'valor_comercial', 'valor_colocado', 'monto_solicitado',
  'ltv', 'tasa_nominal', 'tasa_interes_ea', 'plazo',
  'tipo_liquidacion', 'tipo_amortizacion', 'tipo_contrato', 'notaria'
];

function fmt(v: unknown): string {
  if (typeof v === 'number' && v >= 1000000) return `$${(v / 1e6).toFixed(1)}M`;
  return String(v ?? 'null');
}

async function main() {
  await loadProfiles();
  console.log(`Loaded ${profilesCache.length} investor profiles\n`);

  let creditFixes = 0;
  let invFixes = 0;

  for (const csv of csvCredits) {
    console.log(`\n========== ${csv.codigo} ==========`);

    // Get current DB state
    const { data: dbCredit } = await supabase
      .from('creditos')
      .select('*')
      .eq('codigo_credito', csv.codigo)
      .single();

    if (!dbCredit) {
      console.log(`  ⚠ Credit ${csv.codigo} not found in DB — skipping`);
      continue;
    }

    // ----- STEP A: Compare & fix credit details -----
    const updates: Record<string, unknown> = {};
    const csvValues: Record<string, unknown> = {
      tipo_inmueble: csv.tipo_inmueble,
      valor_comercial: csv.valor_comercial,
      valor_colocado: csv.valor_colocado,
      monto_solicitado: csv.valor_colocado, // monto_solicitado = valor_colocado
      ltv: csv.ltv,
      tasa_nominal: csv.tasa_nominal,
      tasa_interes_ea: csv.tasa_interes_ea,
      plazo: csv.plazo,
      tipo_liquidacion: csv.tipo_liquidacion,
      tipo_amortizacion: csv.tipo_amortizacion,
      tipo_contrato: csv.tipo_contrato,
      notaria: csv.notaria,
    };

    for (const field of fieldsToSync) {
      const dbVal = dbCredit[field];
      const csvVal = csvValues[field];

      if (csvVal === '' || csvVal === 0) continue; // skip empty CSV fields

      if (typeof csvVal === 'number') {
        if (Math.abs(Number(dbVal) - csvVal) > 0.02) {
          updates[field] = csvVal;
        }
      } else {
        if (String(dbVal || '').toLowerCase().trim() !== String(csvVal).toLowerCase().trim()) {
          updates[field] = csvVal;
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      console.log(`  Credit details — ${Object.keys(updates).length} fields to fix:`);
      for (const [k, v] of Object.entries(updates)) {
        console.log(`    ${k}: ${fmt(dbCredit[k])} → ${fmt(v)}`);
      }
      const { error } = await supabase.from('creditos').update(updates).eq('id', dbCredit.id);
      if (error) {
        console.error(`    ✗ Update error: ${error.message}`);
      } else {
        console.log(`    ✓ Updated`);
        creditFixes++;
      }
    } else {
      console.log(`  Credit details — OK ✓`);
    }

    // ----- STEP B: Compare & fix inversiones -----
    const { data: dbInvs } = await supabase
      .from('inversiones')
      .select('id, porcentaje_participacion, monto_invertido, inversionista:profiles!inversionista_id(id, full_name)')
      .eq('credito_id', dbCredit.id);

    const dbInvList = (dbInvs || []).map(i => ({
      id: i.id,
      name: (i.inversionista as any)?.full_name || '',
      investorId: (i.inversionista as any)?.id || '',
      pct: Number(i.porcentaje_participacion),
      monto: Number(i.monto_invertido),
    }));

    const vc = csv.valor_colocado || Number(updates.valor_colocado || dbCredit.valor_colocado);

    // Check if inversiones match
    let invMatch = true;
    if (dbInvList.length !== csv.investors.length) {
      invMatch = false;
    } else {
      for (const csvInv of csv.investors) {
        const dbMatch = dbInvList.find(d => {
          const csvParts = csvInv.name.toLowerCase().split(' ').filter(p => p.length > 2);
          const dbName = d.name.toLowerCase();
          return csvParts.filter(p => dbName.includes(p)).length >= 2 ||
            (csvParts.length <= 2 && csvParts.filter(p => dbName.includes(p)).length >= 1);
        });
        if (!dbMatch || Math.abs(dbMatch.pct - csvInv.pct) > 0.02) {
          invMatch = false;
          break;
        }
        // Also check monto
        const expectedMonto = Math.round(vc * csvInv.pct / 100);
        if (Math.abs(dbMatch.monto - expectedMonto) > 1) {
          invMatch = false;
          break;
        }
      }
    }

    if (!invMatch && csv.investors.length > 0) {
      console.log(`  Inversiones — MISMATCH, fixing:`);
      console.log(`    DB:  ${dbInvList.map(i => `${i.name} ${i.pct}%`).join(', ') || '(empty)'}`);
      console.log(`    CSV: ${csv.investors.map(i => `${i.name} ${i.pct}%`).join(', ')}`);

      // Delete existing
      if (dbInvList.length > 0) {
        const { error: delErr } = await supabase
          .from('inversiones')
          .delete()
          .eq('credito_id', dbCredit.id);
        if (delErr) {
          console.error(`    ✗ Delete error: ${delErr.message}`);
          continue;
        }
        console.log(`    Deleted ${dbInvList.length} existing inversiones`);
      }

      // Create new
      for (const csvInv of csv.investors) {
        const investorId = findInvestorId(csvInv.name);
        if (!investorId) {
          console.error(`    ✗ Investor not found: "${csvInv.name}" — needs manual creation`);
          continue;
        }

        const monto = Math.round(vc * csvInv.pct / 100);
        const { error: insErr } = await supabase.from('inversiones').insert({
          credito_id: dbCredit.id,
          inversionista_id: investorId,
          porcentaje_participacion: csvInv.pct,
          monto_invertido: monto,
          estado: 'activo',
        });

        if (insErr) {
          console.error(`    ✗ ${csvInv.name} (${csvInv.pct}%): ${insErr.message}`);
        } else {
          console.log(`    ✓ ${csvInv.name}: ${csvInv.pct}% → $${monto.toLocaleString()}`);
        }
      }
      invFixes++;
    } else if (csv.investors.length === 0) {
      console.log(`  Inversiones — no investors in CSV (skipping)`);
    } else {
      console.log(`  Inversiones — OK ✓ (${dbInvList.map(i => `${i.name} ${i.pct}%`).join(', ')})`);
    }
  }

  // =====================================================
  // Final summary
  // =====================================================
  console.log(`\n\n========================================`);
  console.log(`SUMMARY: ${creditFixes} credits updated, ${invFixes} inversiones fixed`);
  console.log(`========================================\n`);

  // Full verification
  console.log('=== FULL VERIFICATION ===\n');
  for (const csv of csvCredits) {
    const { data: c } = await supabase
      .from('creditos')
      .select('id, codigo_credito, tipo_inmueble, valor_comercial, valor_colocado, monto_solicitado, tasa_nominal, tasa_interes_ea, plazo, tipo_liquidacion, tipo_amortizacion, tipo_contrato, notaria')
      .eq('codigo_credito', csv.codigo)
      .single();

    if (!c) { console.log(`${csv.codigo}: NOT FOUND`); continue; }

    const { data: invs } = await supabase
      .from('inversiones')
      .select('inversionista:profiles!inversionista_id(full_name), porcentaje_participacion, monto_invertido')
      .eq('credito_id', c.id);

    const total = (invs || []).reduce((s, i) => s + Number(i.monto_invertido), 0);
    const invStr = (invs || []).map(i => `${(i.inversionista as any).full_name} ${i.porcentaje_participacion}%`).join(', ');

    console.log(`${csv.codigo}: ${c.tipo_inmueble}, $${c.valor_comercial / 1e6}M/$${c.valor_colocado / 1e6}M, TN=${c.tasa_nominal}%, EA=${c.tasa_interes_ea}%, plazo=${c.plazo}, ${c.tipo_amortizacion}, ${c.tipo_contrato}, notaria=${c.notaria}`);
    console.log(`  Inversiones (total=$${(total / 1e6).toFixed(1)}M): ${invStr}`);
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
