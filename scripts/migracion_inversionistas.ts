import fs from 'fs';
import csv from 'csv-parser';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SERVICE_ROLE_KEY) {
  console.error('ERROR: Falta la variable SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const CSV_FILE_PATH = 'docs/datos_inversionistas.csv';

// ==========================================
// MAPEO DE COLUMNAS CSV (separado por ;)
// ==========================================
// #;NOMBRE;Cédula Inversionista;Telefono;Email;Fecha registro
// Fechas formato: DD-M-YYYY (guiones)

function parseDateToISO(value: string | undefined): string | null {
  if (!value || value.trim() === '') return null;
  // Soportar tanto DD/MM/YYYY como DD-M-YYYY
  const parts = value.trim().split(/[\/\-]/);
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  const y = parseInt(year);
  if (y < 2000) return null;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function mapRowToData(row: any) {
  // Buscar cedula por cualquier variante del encabezado (encoding puede corromper tildes)
  const cedula = Object.keys(row).find(k => k.toLowerCase().includes('dula'));
  const fechaReg = Object.keys(row).find(k => k.toLowerCase().includes('fecha'));

  return {
    nombre: (row['NOMBRE'] || '').trim(),
    cedula: (cedula ? row[cedula] || '' : '').trim(),
    telefono: (row['Telefono'] || row['Teléfono'] || '').trim() || null,
    email: (row['Email'] || row['email'] || '').trim(),
    fechaRegistro: parseDateToISO(fechaReg ? row[fechaReg] : undefined),
  };
}

// ==========================================
// LOGICA DE MIGRACION
// ==========================================
async function migrate() {
  const results: any[] = [];

  console.log('Iniciando lectura del CSV de inversionistas...');

  fs.createReadStream(path.resolve(CSV_FILE_PATH))
    .pipe(csv({ separator: ';' }))
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      console.log(`Se encontraron ${results.length} filas. Procesando...\n`);

      let exitosos = 0;
      let fallidos = 0;
      let sinEmail = 0;

      for (const [index, row] of results.entries()) {
        try {
          const data = mapRowToData(row);

          if (!data.email) {
            console.log(`Fila ${index + 1}: Sin email, saltando.`);
            sinEmail++;
            continue;
          }

          console.log(`Fila ${index + 1}: ${data.nombre} - ${data.email}`);

          // PASO 1: Crear o Buscar Usuario en Auth
          let userId = '';
          const { data: existingUsers } = await supabase.auth.admin.listUsers();
          const emailLower = data.email.toLowerCase();
          const foundUser = existingUsers.users.find(u => u.email?.toLowerCase() === emailLower);

          if (foundUser) {
            console.log(`   Usuario ya existe. ID: ${foundUser.id}`);
            userId = foundUser.id;
          } else {
            const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
              email: emailLower,
              password: 'Aluri2026!',
              email_confirm: true,
              user_metadata: {
                full_name: data.nombre,
                document_id: data.cedula,
                role: 'inversionista'
              }
            });

            if (authError) throw new Error(`Auth Error: ${authError.message}`);
            userId = newUser.user!.id;
            console.log(`   Usuario creado. ID: ${userId}`);
          }

          // PASO 2: Crear o actualizar perfil
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id, role')
            .eq('id', userId)
            .single();

          if (!existingProfile) {
            const { error: profileError } = await supabase
              .from('profiles')
              .insert({
                id: userId,
                email: emailLower,
                full_name: data.nombre,
                document_id: data.cedula,
                phone: data.telefono,
                role: 'inversionista',
                verification_status: 'verified',
              });

            if (profileError) throw new Error(`Profile Error: ${profileError.message}`);
            console.log(`   Perfil creado como inversionista.`);
          } else {
            // Actualizar datos sin sobreescribir el rol si ya es admin
            const updateData: any = {
              full_name: data.nombre,
              document_id: data.cedula,
              phone: data.telefono,
            };
            if (existingProfile.role !== 'admin') {
              updateData.role = 'inversionista';
            }

            const { error: updateError } = await supabase
              .from('profiles')
              .update(updateData)
              .eq('id', userId);

            if (updateError) throw new Error(`Update Error: ${updateError.message}`);
            console.log(`   Perfil actualizado.`);
          }

          exitosos++;

        } catch (error: any) {
          console.error(`Error en fila ${index + 1}:`, error.message);
          fallidos++;
        }
      }

      console.log(`\n=============================`);
      console.log(`Migracion Inversionistas Finalizada.`);
      console.log(`Exitosos: ${exitosos}`);
      console.log(`Fallidos: ${fallidos}`);
      console.log(`Sin email: ${sinEmail}`);
      console.log(`=============================`);
    });
}

migrate();
