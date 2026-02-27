import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

async function main() {
  const RACING_ID = 'b4b4ac79-5a9d-42e8-b58e-9b3ce64509a9';
  const ROOTED_ID = 'da2ffc6c-18f7-4106-92c8-8b3fc95e5e4c';

  // Check if Racing House is used by any credit
  const { data: credits } = await s.from('creditos').select('codigo_credito').eq('cliente_id', RACING_ID);
  console.log('Credits using Racing House:', credits?.map(c => c.codigo_credito));

  // Check inversiones
  const { data: invs } = await s.from('inversiones').select('credito_id').eq('inversionista_id', RACING_ID);
  console.log('Inversiones using Racing House:', invs?.length || 0);

  if ((credits?.length || 0) === 0 && (invs?.length || 0) === 0) {
    // Safe to change Racing House email to free up gerencia@rootedhouse.com.co
    console.log('\nRacing House not used by any credit. Changing email...');

    // Move Racing House to placeholder email
    await s.from('profiles').update({ email: 'racing_house_unused@placeholder.local' }).eq('id', RACING_ID);
    await s.auth.admin.updateUserById(RACING_ID, { email: 'racing_house_unused@placeholder.local' });
    console.log('Racing House email changed to placeholder.');
  } else {
    console.log('\nRacing House IS used. Reassigning credits first...');
    // If it's used, we need to point those credits to Rooted House instead
    for (const c of credits || []) {
      console.log(`  Reassigning ${c.codigo_credito} from Racing to Rooted...`);
      await s.from('creditos').update({ cliente_id: ROOTED_ID }).eq('cliente_id', RACING_ID);
    }
    // Then change email
    await s.from('profiles').update({ email: 'racing_house_unused@placeholder.local' }).eq('id', RACING_ID);
    await s.auth.admin.updateUserById(RACING_ID, { email: 'racing_house_unused@placeholder.local' });
    console.log('Done reassigning and freeing email.');
  }

  // Now set correct email on Rooted House
  console.log('\nSetting gerencia@rootedhouse.com.co on Rooted House...');
  const { error: e1 } = await s.from('profiles').update({
    email: 'gerencia@rootedhouse.com.co',
    full_name: 'Rooted House',
  }).eq('id', ROOTED_ID);
  const { error: e2 } = await s.auth.admin.updateUserById(ROOTED_ID, { email: 'gerencia@rootedhouse.com.co' });

  if (e1 || e2) {
    console.error('ERROR:', e1?.message, e2?.message);
  } else {
    console.log('Rooted House email fixed! ✓');
  }

  // Also fix CR014 - Construcciones Vela
  console.log('\n=== Fix CR014 (Construcciones Vela) ===');
  const { data: cr014 } = await s.from('creditos').select('id, cliente_id').eq('codigo_credito', 'CR014').single();
  const { data: camiloProfile } = await s.from('profiles').select('id, full_name, email, document_id').eq('document_id', '80028033').single();

  if (cr014 && camiloProfile && cr014.cliente_id === camiloProfile.id) {
    console.log('CR014 currently points to Camilo Vela - wrong! Should be Construcciones Vela (901838123)');

    // Check if Construcciones Vela profile exists separately
    const { data: constProfile } = await s.from('profiles').select('id, full_name, email').eq('document_id', '901838123').single();
    if (constProfile) {
      console.log(`Construcciones Vela profile exists: ${constProfile.id}`);
      await s.from('creditos').update({ cliente_id: constProfile.id }).eq('id', cr014.id);
      console.log('CR014 reassigned ✓');
    } else {
      console.log('Construcciones Vela (901838123) not found. Creating...');
      const { data: authData, error: authErr } = await s.auth.admin.createUser({
        email: 'construccionesvela@outlook.com',
        password: 'Temp901838123!',
        email_confirm: true,
      });
      if (authErr) {
        console.error('Auth error:', authErr.message);
      } else if (authData.user) {
        await s.from('profiles').insert({
          id: authData.user.id,
          email: 'construccionesvela@outlook.com',
          full_name: 'Construcciones Vela',
          document_id: '901838123',
          phone: '3142182990',
          city: 'Bogota',
          role: 'propietario',
          verification_status: 'verified'
        });
        await s.from('creditos').update({ cliente_id: authData.user.id }).eq('id', cr014.id);
        console.log('Created and assigned ✓');
      }
    }
  } else {
    console.log('CR014 already correct or Camilo Vela not found');
  }

  // Verify final state
  console.log('\n=== VERIFICATION ===');
  const { data: allCredits } = await s.from('creditos').select('codigo_credito, cliente_id').order('codigo_credito');
  for (const c of allCredits || []) {
    const { data: p } = await s.from('profiles').select('full_name, email, document_id').eq('id', c.cliente_id).single();
    if (p) {
      console.log(`${c.codigo_credito}: ${p.full_name} | ${p.email} | cedula: ${p.document_id}`);
    }
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
