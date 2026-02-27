import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function parseMoney(value: string): number {
  if (!value) return 0;
  return parseFloat(value.replace(/[$\s,]/g, '')) || 0;
}

async function main() {
  // Read CSV
  const csvContent = fs.readFileSync(path.resolve('docs/colocaciones 2026-02-26.csv'), 'latin1');
  const lines = csvContent.split('\n').filter(l => l.trim().length > 0);

  // Skip header
  const dataLines = lines.slice(1);

  // Get all credits with their debtor profiles
  const { data: creditos } = await supabase
    .from('creditos')
    .select('id, codigo_credito, cliente_id, co_deudor_id')
    .order('codigo_credito');

  // Get all profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, document_id, phone, city, role');

  const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
  const creditMap = new Map(creditos?.map(c => [c.codigo_credito, c]) || []);

  // Also get investor profiles
  const { data: inversiones } = await supabase
    .from('inversiones')
    .select('credito_id, inversionista_id')
    .order('credito_id');

  const investorsByCredit = new Map<string, string[]>();
  for (const inv of inversiones || []) {
    const existing = investorsByCredit.get(inv.credito_id) || [];
    existing.push(inv.inversionista_id);
    investorsByCredit.set(inv.credito_id, existing);
  }

  let issues = 0;

  for (const line of dataLines) {
    const cols = line.split(';');
    const codigo = cols[0]?.trim();
    if (!codigo || !codigo.startsWith('CR')) continue;

    const csvCedula = cols[2]?.trim();
    const csvNombre = cols[3]?.trim();
    const csvTelefono = cols[4]?.trim();
    const csvEmail = cols[5]?.trim();
    const csvCiudad = cols[7]?.trim();
    const csvCedulaDeudor2 = cols[8]?.trim();
    const csvDeudor2 = cols[9]?.trim();
    const csvPnPj = cols[49]?.trim(); // PN/PJ column

    const credit = creditMap.get(codigo);
    if (!credit) {
      console.log(`${codigo}: NO EXISTE EN DB`);
      issues++;
      continue;
    }

    // Check debtor profile
    const debtorProfile = profileMap.get(credit.cliente_id);
    if (!debtorProfile) {
      console.log(`${codigo}: Deudor sin perfil en DB (cliente_id: ${credit.cliente_id})`);
      issues++;
      continue;
    }

    // Compare debtor fields
    const checks: [string, string | null, string][] = [
      ['email', debtorProfile.email, csvEmail],
      ['cedula', debtorProfile.document_id, csvCedula],
      ['nombre', debtorProfile.full_name, csvNombre],
      ['telefono', debtorProfile.phone, csvTelefono],
      ['ciudad', debtorProfile.city, csvCiudad],
    ];

    for (const [field, dbVal, csvVal] of checks) {
      if (!csvVal) continue;
      const dbNorm = (dbVal || '').toLowerCase().trim();
      const csvNorm = csvVal.toLowerCase().trim();
      if (dbNorm !== csvNorm) {
        console.log(`${codigo} deudor ${field}: DB="${dbVal}" CSV="${csvVal}"`);
        issues++;
      }
    }

    // Check investors
    const investorNames: string[] = [];
    for (let i = 0; i < 5; i++) {
      const name = cols[10 + i * 2]?.trim();
      if (name) investorNames.push(name);
    }

    const creditInvestorIds = investorsByCredit.get(credit.id) || [];
    for (const invId of creditInvestorIds) {
      const invProfile = profileMap.get(invId);
      if (invProfile) {
        // Check if investor name matches any CSV investor
        const dbName = (invProfile.full_name || '').toLowerCase();
        const matched = investorNames.some(n => {
          const csvN = n.toLowerCase();
          return dbName.includes(csvN.split(' ')[0]) || csvN.includes(dbName.split(' ')[0]);
        });
        if (!matched && investorNames.length > 0) {
          console.log(`${codigo} inversionista: DB="${invProfile.full_name}" no matchea CSV=[${investorNames.join(', ')}]`);
          issues++;
        }
      }
    }
  }

  // Also check investor emails - get all investor profiles
  console.log('\n=== INVESTOR PROFILES ===');
  const investorProfiles = profiles?.filter(p => p.role === 'inversionista') || [];
  for (const inv of investorProfiles) {
    console.log(`  ${inv.full_name}: email=${inv.email}, cedula=${inv.document_id}, phone=${inv.phone}`);
  }

  // Check debtor profiles
  console.log('\n=== DEBTOR PROFILES ===');
  const debtorProfiles = profiles?.filter(p => p.role === 'propietario') || [];
  for (const d of debtorProfiles) {
    console.log(`  ${d.full_name}: email=${d.email}, cedula=${d.document_id}, phone=${d.phone}`);
  }

  console.log(`\nTotal issues: ${issues}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
