import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const csvContent = fs.readFileSync(path.resolve('docs/datos_inversionistas.csv'), 'latin1');
  const lines = csvContent.split('\n').filter(l => l.trim().length > 0);
  const dataLines = lines.slice(1); // skip header

  // Get all investor profiles
  const { data: profiles } = await s
    .from('profiles')
    .select('id, full_name, email, document_id, phone, role')
    .eq('role', 'inversionista');

  const profileByCedula = new Map(
    (profiles || []).filter(p => p.document_id).map(p => [p.document_id!, p])
  );

  let issues = 0;

  console.log('=== INVESTOR EMAIL VERIFICATION ===\n');

  for (const line of dataLines) {
    const cols = line.split(';');
    const nombre = cols[1]?.trim();
    const cedula = cols[2]?.trim();
    const telefono = cols[3]?.trim();
    const email = cols[4]?.trim();

    if (!cedula || !nombre) continue;

    const profile = profileByCedula.get(cedula);

    if (!profile) {
      console.log(`NOT FOUND: ${nombre} (cedula: ${cedula}, email: ${email})`);
      issues++;
      continue;
    }

    // Check email
    if (profile.email?.toLowerCase() !== email?.toLowerCase()) {
      console.log(`EMAIL MISMATCH: ${nombre}`);
      console.log(`  DB:  ${profile.email}`);
      console.log(`  CSV: ${email}`);
      issues++;
    }

    // Check phone
    if (telefono && profile.phone !== telefono) {
      console.log(`PHONE MISMATCH: ${nombre}`);
      console.log(`  DB:  ${profile.phone}`);
      console.log(`  CSV: ${telefono}`);
      issues++;
    }

    // Check name
    if (profile.full_name?.toLowerCase() !== nombre?.toLowerCase()) {
      console.log(`NAME MISMATCH: cedula ${cedula}`);
      console.log(`  DB:  ${profile.full_name}`);
      console.log(`  CSV: ${nombre}`);
      issues++;
    }
  }

  // Also check for investor profiles NOT in the CSV
  console.log('\n=== INVESTOR PROFILES NOT IN CSV ===');
  const csvCedulas = new Set(dataLines.map(l => l.split(';')[2]?.trim()).filter(Boolean));
  for (const p of profiles || []) {
    if (p.document_id && !csvCedulas.has(p.document_id)) {
      console.log(`  ${p.full_name}: cedula=${p.document_id}, email=${p.email}`);
    }
    if (!p.document_id) {
      console.log(`  ${p.full_name}: NO CEDULA, email=${p.email}`);
    }
  }

  console.log(`\nTotal issues: ${issues}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
