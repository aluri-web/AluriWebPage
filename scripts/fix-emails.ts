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

async function main() {
  // Read CSV
  const csvContent = fs.readFileSync(path.resolve('docs/colocaciones 2026-02-26.csv'), 'latin1');
  const lines = csvContent.split('\n').filter(l => l.trim().length > 0);
  const dataLines = lines.slice(1);

  // Build CSV map: codigo -> { cedula, nombre, email, telefono, ciudad }
  const csvDebtors = new Map<string, { cedula: string; nombre: string; email: string; telefono: string; ciudad: string }>();
  for (const line of dataLines) {
    const cols = line.split(';');
    const codigo = cols[0]?.trim();
    if (!codigo || !codigo.startsWith('CR')) continue;
    csvDebtors.set(codigo, {
      cedula: cols[2]?.trim() || '',
      nombre: cols[3]?.trim() || '',
      email: cols[5]?.trim() || '',
      telefono: cols[4]?.trim() || '',
      ciudad: cols[7]?.trim() || '',
    });
  }

  // Get all profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, document_id, phone, city, role');

  const profileByCedula = new Map<string, typeof profiles extends (infer T)[] | null ? T : never>();
  const profileByEmail = new Map<string, typeof profiles extends (infer T)[] | null ? T : never>();
  for (const p of profiles || []) {
    if (p.document_id) profileByCedula.set(p.document_id, p);
    if (p.email) profileByEmail.set(p.email.toLowerCase(), p);
  }

  // Get all credits
  const { data: creditos } = await supabase
    .from('creditos')
    .select('id, codigo_credito, cliente_id')
    .order('codigo_credito');

  const creditMap = new Map(creditos?.map(c => [c.codigo_credito, c]) || []);

  console.log('=== FIXING DEBTOR EMAILS & ASSIGNMENTS ===\n');

  let fixes = 0;

  for (const [codigo, csv] of csvDebtors) {
    const credit = creditMap.get(codigo);
    if (!credit) {
      console.log(`${codigo}: skipping (not in DB)`);
      continue;
    }

    // Find the profile that should be the debtor (by cedula)
    const correctProfile = profileByCedula.get(csv.cedula);

    if (!correctProfile) {
      console.log(`${codigo}: Profile for cedula ${csv.cedula} (${csv.nombre}) NOT FOUND in DB`);

      // Check if maybe we need to create this profile
      // First check if there's already a profile with this email
      const existingByEmail = profileByEmail.get(csv.email.toLowerCase());
      if (existingByEmail) {
        console.log(`  -> Profile with email ${csv.email} exists: ${existingByEmail.full_name} (cedula: ${existingByEmail.document_id})`);
        console.log(`  -> Need to update cedula on that profile and reassign credit`);

        // Update profile cedula/name
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            document_id: csv.cedula,
            full_name: csv.nombre,
            phone: csv.telefono || existingByEmail.phone,
            city: csv.ciudad || existingByEmail.city,
          })
          .eq('id', existingByEmail.id);

        if (updateError) {
          console.error(`  ERROR updating profile: ${updateError.message}`);
        } else {
          console.log(`  -> Profile updated: ${existingByEmail.full_name} -> ${csv.nombre}`);
        }

        // Reassign credit if needed
        if (credit.cliente_id !== existingByEmail.id) {
          const { error: reassignError } = await supabase
            .from('creditos')
            .update({ cliente_id: existingByEmail.id })
            .eq('id', credit.id);

          if (reassignError) {
            console.error(`  ERROR reassigning credit: ${reassignError.message}`);
          } else {
            console.log(`  -> Credit reassigned to ${existingByEmail.id}`);
            fixes++;
          }
        }
      } else {
        console.log(`  -> No profile found by cedula or email. May need manual creation.`);
      }
      continue;
    }

    // Check if credit points to the correct profile
    if (credit.cliente_id !== correctProfile.id) {
      console.log(`${codigo}: WRONG cliente_id. DB profile: ${correctProfile.full_name} (${correctProfile.id})`);

      const { error } = await supabase
        .from('creditos')
        .update({ cliente_id: correctProfile.id })
        .eq('id', credit.id);

      if (error) {
        console.error(`  ERROR reassigning: ${error.message}`);
      } else {
        console.log(`  -> Reassigned to correct profile`);
        fixes++;
      }
    }

    // Check if profile email is correct
    if (correctProfile.email?.toLowerCase() !== csv.email.toLowerCase()) {
      console.log(`${codigo}: WRONG email on profile ${correctProfile.full_name}`);
      console.log(`  DB: ${correctProfile.email}`);
      console.log(`  CSV: ${csv.email}`);

      // Update profile email
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ email: csv.email })
        .eq('id', correctProfile.id);

      if (profileError) {
        console.error(`  ERROR updating profile email: ${profileError.message}`);
      } else {
        console.log(`  -> Profile email updated`);
        fixes++;
      }

      // Update auth user email
      const { error: authError } = await supabase.auth.admin.updateUserById(
        correctProfile.id,
        { email: csv.email }
      );

      if (authError) {
        console.error(`  ERROR updating auth email: ${authError.message}`);
      } else {
        console.log(`  -> Auth email updated`);
      }
    }

    // Update city if missing
    if (!correctProfile.city && csv.ciudad) {
      await supabase
        .from('profiles')
        .update({ city: csv.ciudad })
        .eq('id', correctProfile.id);
      console.log(`${codigo}: Updated city to ${csv.ciudad}`);
    }
  }

  console.log(`\nTotal fixes applied: ${fixes}`);
  console.log('\nRe-run verify-emails.ts to confirm.');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
