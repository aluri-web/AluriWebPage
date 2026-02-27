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

  // Build CSV map: cedula -> { nombre, email, telefono, ciudad }
  // Some debtors appear multiple times (e.g., CR018 & CR019 same debtor), use first occurrence
  const csvByCedula = new Map<string, { nombre: string; email: string; telefono: string; ciudad: string; codigos: string[] }>();
  for (const line of dataLines) {
    const cols = line.split(';');
    const codigo = cols[0]?.trim();
    if (!codigo || !codigo.startsWith('CR')) continue;
    const cedula = cols[2]?.trim();
    if (!cedula) continue;
    const existing = csvByCedula.get(cedula);
    if (existing) {
      existing.codigos.push(codigo);
    } else {
      csvByCedula.set(cedula, {
        nombre: cols[3]?.trim() || '',
        email: cols[5]?.trim() || '',
        telefono: cols[4]?.trim() || '',
        ciudad: cols[7]?.trim() || '',
        codigos: [codigo],
      });
    }
  }

  // Get all propietario profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, document_id, phone, city, role')
    .eq('role', 'propietario');

  console.log('=== PHASE 1: Set temporary emails on mismatched profiles ===\n');

  // Find profiles whose email doesn't match CSV
  const toFix: { profileId: string; currentEmail: string; correctEmail: string; cedula: string; nombre: string }[] = [];

  for (const profile of profiles || []) {
    if (!profile.document_id) continue;
    const csvData = csvByCedula.get(profile.document_id);
    if (!csvData) continue;

    if (profile.email?.toLowerCase() !== csvData.email.toLowerCase()) {
      toFix.push({
        profileId: profile.id,
        currentEmail: profile.email || '',
        correctEmail: csvData.email,
        cedula: profile.document_id,
        nombre: csvData.nombre,
      });
      console.log(`  ${csvData.nombre} (${profile.document_id}): "${profile.email}" -> "${csvData.email}"`);
    }
  }

  if (toFix.length === 0) {
    console.log('  No email mismatches found!');
    return;
  }

  console.log(`\n  Found ${toFix.length} profiles to fix.\n`);

  // Phase 1: Set all to temporary emails
  console.log('=== PHASE 1: Setting temporary emails ===\n');
  for (const fix of toFix) {
    const tempEmail = `temp_fix_${fix.cedula}@placeholder.local`;

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ email: tempEmail })
      .eq('id', fix.profileId);

    const { error: authError } = await supabase.auth.admin.updateUserById(
      fix.profileId,
      { email: tempEmail }
    );

    if (profileError || authError) {
      console.error(`  ERROR ${fix.nombre}: profile=${profileError?.message}, auth=${authError?.message}`);
    } else {
      console.log(`  ${fix.nombre}: set to ${tempEmail}`);
    }
  }

  // Phase 2: Set correct emails
  console.log('\n=== PHASE 2: Setting correct emails ===\n');
  for (const fix of toFix) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ email: fix.correctEmail })
      .eq('id', fix.profileId);

    const { error: authError } = await supabase.auth.admin.updateUserById(
      fix.profileId,
      { email: fix.correctEmail }
    );

    if (profileError || authError) {
      console.error(`  ERROR ${fix.nombre}: profile=${profileError?.message}, auth=${authError?.message}`);
    } else {
      console.log(`  ${fix.nombre}: ${fix.correctEmail} ✓`);
    }
  }

  // Phase 3: Also fix name/city where needed
  console.log('\n=== PHASE 3: Fixing names and cities ===\n');
  for (const profile of profiles || []) {
    if (!profile.document_id) continue;
    const csvData = csvByCedula.get(profile.document_id);
    if (!csvData) continue;

    const updates: Record<string, string> = {};
    if (profile.full_name !== csvData.nombre) updates.full_name = csvData.nombre;
    if (!profile.city && csvData.ciudad) updates.city = csvData.ciudad;
    if (!profile.phone && csvData.telefono) updates.phone = csvData.telefono;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id);

      if (error) {
        console.error(`  ERROR ${csvData.nombre}: ${error.message}`);
      } else {
        console.log(`  ${csvData.nombre}: updated ${Object.keys(updates).join(', ')}`);
      }
    }
  }

  // Phase 4: Fix CR001 - needs Camilo Vela as separate profile from Construcciones Vela
  console.log('\n=== PHASE 4: Fix CR001/CR014 (Camilo Vela vs Construcciones Vela) ===\n');

  // Check if Camilo Vela profile exists (cedula 80028033)
  const camiloProfile = (profiles || []).find(p => p.document_id === '80028033');
  const construccionesProfile = (profiles || []).find(p => p.document_id === '901838123');

  // Get current CR001 and CR014 credits
  const { data: cr001 } = await supabase.from('creditos').select('id, cliente_id').eq('codigo_credito', 'CR001').single();
  const { data: cr014 } = await supabase.from('creditos').select('id, cliente_id').eq('codigo_credito', 'CR014').single();

  if (camiloProfile) {
    console.log(`  Camilo Vela profile found: ${camiloProfile.id} (email: ${camiloProfile.email})`);
    // Make sure CR001 points to Camilo
    if (cr001 && cr001.cliente_id !== camiloProfile.id) {
      await supabase.from('creditos').update({ cliente_id: camiloProfile.id }).eq('id', cr001.id);
      console.log(`  CR001 reassigned to Camilo Vela`);
    }
  } else {
    console.log(`  Camilo Vela (cedula 80028033) not found - checking current state...`);
    // The first fix script changed the profile with email velaasociados@outlook.com
    // from Construcciones Vela to Camilo Vela. This means CR014 now points to Camilo Vela!
    // We need to undo this and create a separate profile.

    // Find the profile that was modified (currently has cedula 80028033 after fix-emails.ts)
    const modifiedProfile = (profiles || []).find(p => p.document_id === '80028033');
    if (modifiedProfile) {
      console.log(`  Found modified profile: ${modifiedProfile.full_name} (was changed by previous script)`);

      // This profile should be Camilo Vela for CR001
      // We need to create a NEW profile for Construcciones Vela for CR014
      console.log(`  Need to create Construcciones Vela as separate profile for CR014`);

      // Create auth user for Construcciones Vela
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: 'construccionesvela@outlook.com', // Slightly different since velaasociados is taken
        password: `Temp901838123!`,
        email_confirm: true,
        user_metadata: { full_name: 'Construcciones Vela', document_id: '901838123', role: 'propietario' }
      });

      if (authError) {
        console.error(`  ERROR creating auth user: ${authError.message}`);
      } else if (authData.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: 'construccionesvela@outlook.com',
            full_name: 'Construcciones Vela',
            document_id: '901838123',
            phone: '3142182990',
            city: 'Bogota',
            role: 'propietario',
            verification_status: 'verified'
          });

        if (profileError) {
          console.error(`  ERROR creating profile: ${profileError.message}`);
        } else {
          console.log(`  Created Construcciones Vela profile: ${authData.user.id}`);

          // Reassign CR014 to new profile
          if (cr014) {
            await supabase.from('creditos').update({ cliente_id: authData.user.id }).eq('id', cr014.id);
            console.log(`  CR014 reassigned to Construcciones Vela`);
          }
        }
      }
    }
  }

  if (construccionesProfile && cr014 && cr014.cliente_id !== construccionesProfile.id) {
    // If Construcciones Vela already has a proper profile, just reassign CR014
    await supabase.from('creditos').update({ cliente_id: construccionesProfile.id }).eq('id', cr014.id);
    console.log(`  CR014 reassigned to existing Construcciones Vela profile`);
  }

  // Phase 5: Fix CR024 - might have wrong profile
  console.log('\n=== PHASE 5: Fix CR024 (Laura Beltran) ===\n');
  const { data: cr024 } = await supabase.from('creditos').select('id, cliente_id').eq('codigo_credito', 'CR024').single();
  if (cr024) {
    const cr024Profile = (profiles || []).find(p => p.id === cr024.cliente_id);
    console.log(`  CR024 current debtor: ${cr024Profile?.full_name} (cedula: ${cr024Profile?.document_id}, email: ${cr024Profile?.email})`);

    const lauraProfile = (profiles || []).find(p => p.document_id === '1079263381');
    if (lauraProfile) {
      console.log(`  Laura Beltran profile found: ${lauraProfile.id}`);
      if (cr024.cliente_id !== lauraProfile.id) {
        await supabase.from('creditos').update({ cliente_id: lauraProfile.id }).eq('id', cr024.id);
        console.log(`  CR024 reassigned to Laura Beltran`);
      }
    } else {
      console.log(`  Laura Beltran (1079263381) not found. Creating...`);
      const { data: authData, error: authCreateErr } = await supabase.auth.admin.createUser({
        email: 'Beltrancacereslaura@gmail.com',
        password: 'Temp1079263381!',
        email_confirm: true,
        user_metadata: { full_name: 'Laura Beltran', document_id: '1079263381', role: 'propietario' }
      });

      if (authCreateErr) {
        // Email might already exist from the shifted assignments
        console.log(`  Auth create error: ${authCreateErr.message}`);
        // Try to find by email
        const existingByEmail = (profiles || []).find(p => p.email?.toLowerCase() === 'beltrancacereslaura@gmail.com');
        if (existingByEmail) {
          console.log(`  Found profile with that email: ${existingByEmail.full_name} (${existingByEmail.id})`);
          // Update it to be Laura Beltran
          await supabase.from('profiles').update({
            full_name: 'Laura Beltran',
            document_id: '1079263381',
            phone: '3108106061',
            city: 'Bogota',
          }).eq('id', existingByEmail.id);
          await supabase.from('creditos').update({ cliente_id: existingByEmail.id }).eq('id', cr024.id);
          console.log(`  CR024 reassigned`);
        }
      } else if (authData.user) {
        await supabase.from('profiles').insert({
          id: authData.user.id,
          email: 'Beltrancacereslaura@gmail.com',
          full_name: 'Laura Beltran',
          document_id: '1079263381',
          phone: '3108106061',
          city: 'Bogota',
          role: 'propietario',
          verification_status: 'verified'
        });
        await supabase.from('creditos').update({ cliente_id: authData.user.id }).eq('id', cr024.id);
        console.log(`  Created Laura Beltran and assigned to CR024`);
      }
    }
  }

  // Phase 6: Fix CR023 - Poblado Corp profile
  console.log('\n=== PHASE 6: Fix CR023 (Poblado Corp) ===\n');
  const { data: cr023 } = await supabase.from('creditos').select('id, cliente_id').eq('codigo_credito', 'CR023').single();
  if (cr023) {
    const pobladoProfile = (await supabase.from('profiles').select('*').eq('document_id', '901709643-9').single()).data;
    if (pobladoProfile) {
      console.log(`  Poblado Corp profile: ${pobladoProfile.full_name} (email: ${pobladoProfile.email})`);
      if (cr023.cliente_id !== pobladoProfile.id) {
        await supabase.from('creditos').update({ cliente_id: pobladoProfile.id }).eq('id', cr023.id);
        console.log(`  CR023 reassigned to Poblado Corp`);
      }
    } else {
      console.log(`  Poblado Corp (901709643-9) not found. Need to create.`);
      const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email: 'pobladocp@gmail.com',
        password: 'Temp9017096439!',
        email_confirm: true,
        user_metadata: { full_name: 'Poblado Corp. Group SAS', document_id: '901709643-9', role: 'propietario' }
      });
      if (authErr) {
        console.log(`  Auth error: ${authErr.message}`);
        const existingByEmail = (await supabase.from('profiles').select('*').eq('email', 'pobladocp@gmail.com').single()).data;
        if (existingByEmail) {
          console.log(`  Found existing with that email: ${existingByEmail.full_name}`);
          await supabase.from('profiles').update({
            full_name: 'Poblado Corp. Group SAS',
            document_id: '901709643-9',
            phone: '3107515271',
            city: 'Bogota',
          }).eq('id', existingByEmail.id);
          await supabase.from('creditos').update({ cliente_id: existingByEmail.id }).eq('id', cr023.id);
          console.log(`  CR023 reassigned`);
        }
      } else if (authData.user) {
        await supabase.from('profiles').insert({
          id: authData.user.id,
          email: 'pobladocp@gmail.com',
          full_name: 'Poblado Corp. Group SAS',
          document_id: '901709643-9',
          phone: '3107515271',
          city: 'Bogota',
          role: 'propietario',
          verification_status: 'verified'
        });
        await supabase.from('creditos').update({ cliente_id: authData.user.id }).eq('id', cr023.id);
        console.log(`  Created Poblado Corp and assigned to CR023`);
      }
    }
  }

  // Phase 7: Fix CR025 (Rooted House)
  console.log('\n=== PHASE 7: Fix CR025 (Rooted House) ===\n');
  const { data: cr025 } = await supabase.from('creditos').select('id, cliente_id').eq('codigo_credito', 'CR025').single();
  if (cr025) {
    const rootedProfile = (await supabase.from('profiles').select('*').eq('document_id', '901546123').single()).data;
    if (rootedProfile) {
      console.log(`  Rooted House profile: ${rootedProfile.full_name} (email: ${rootedProfile.email})`);
      if (cr025.cliente_id !== rootedProfile.id) {
        await supabase.from('creditos').update({ cliente_id: rootedProfile.id }).eq('id', cr025.id);
        console.log(`  CR025 reassigned`);
      }
      if (rootedProfile.email?.toLowerCase() !== 'gerencia@rootedhouse.com.co') {
        await supabase.from('profiles').update({ email: 'gerencia@rootedhouse.com.co', full_name: 'Rooted House' }).eq('id', rootedProfile.id);
        await supabase.auth.admin.updateUserById(rootedProfile.id, { email: 'gerencia@rootedhouse.com.co' });
        console.log(`  Email fixed to gerencia@rootedhouse.com.co`);
      }
    }
  }

  console.log('\n=== DONE ===');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
