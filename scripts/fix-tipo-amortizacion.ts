import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Re-read CSV to get correct tipo_amortizacion
const raw = fs.readFileSync('docs/colocaciones 2026-02-26.csv', 'latin1');
const lines = raw.split('\n').filter(l => l.trim().length > 0);

function mapTipoAmortizacion(s: string): string {
  const lower = s.trim().toLowerCase();
  // "Solo intereses" → solo_interes
  // "Capital e intereses" → francesa
  if (lower.startsWith('solo')) return 'solo_interes';
  return 'francesa';
}

async function main() {
  console.log('=== Fix tipo_amortizacion ===\n');

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(';');
    const codigo = cols[0]?.trim();
    if (!codigo || !codigo.startsWith('CR')) continue;

    const csvTipo = cols[35]?.trim() || '';
    const correctValue = mapTipoAmortizacion(csvTipo);

    const { data: credit } = await supabase
      .from('creditos')
      .select('id, codigo_credito, tipo_amortizacion')
      .eq('codigo_credito', codigo)
      .single();

    if (!credit) continue;

    if (credit.tipo_amortizacion !== correctValue) {
      const { error } = await supabase
        .from('creditos')
        .update({ tipo_amortizacion: correctValue })
        .eq('id', credit.id);

      if (error) {
        console.error(`✗ ${codigo}: ${error.message}`);
      } else {
        console.log(`✓ ${codigo}: "${csvTipo}" → ${credit.tipo_amortizacion} → ${correctValue}`);
      }
    } else {
      console.log(`  ${codigo}: ${correctValue} (OK)`);
    }
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
