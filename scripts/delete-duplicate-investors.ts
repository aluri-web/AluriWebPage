import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

async function main() {
  const placeholderEmails = [
    'inv_javier_arnulfo_rivera@placeholder.local',
    'inv_carlos_eduardo_londono@placeholder.local',
  ];

  for (const email of placeholderEmails) {
    const { data: profile } = await s.from('profiles').select('id, full_name, email, document_id, role').eq('email', email).single();
    if (!profile) {
      console.log(`NOT FOUND: ${email}`);
      continue;
    }

    console.log(`\nFound: ${profile.full_name} (${profile.email})`);
    console.log(`  ID: ${profile.id}, cedula: ${profile.document_id}, role: ${profile.role}`);

    // Check for inversiones
    const { data: invs } = await s.from('inversiones').select('id, credito_id').eq('inversionista_id', profile.id);
    if (invs && invs.length > 0) {
      console.log(`  WARNING: Has ${invs.length} inversiones! Skipping.`);
      continue;
    }

    // Check for transacciones
    const { data: txs } = await s.from('transacciones').select('id').eq('usuario_id', profile.id);
    if (txs && txs.length > 0) {
      console.log(`  WARNING: Has ${txs.length} transacciones! Skipping.`);
      continue;
    }

    // Safe to delete
    const { error: profileErr } = await s.from('profiles').delete().eq('id', profile.id);
    if (profileErr) {
      console.log(`  Profile delete error: ${profileErr.message}`);
    } else {
      console.log(`  Profile deleted OK`);
    }

    const { error: authErr } = await s.auth.admin.deleteUser(profile.id);
    if (authErr) {
      console.log(`  Auth delete error: ${authErr.message}`);
    } else {
      console.log(`  Auth user deleted OK`);
    }
  }

  console.log('\nDone.');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
