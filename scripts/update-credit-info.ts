import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SERVICE_ROLE_KEY) {
  console.error('ERROR: Falta SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DRY_RUN = process.argv.includes('--dry-run');

// =====================================================
// DATA: Info de propietarios/deudores por crédito
// =====================================================

interface CreditInfo {
  codigo: string;
  deudor: {
    nombre: string;
    cedula: string;
    telefono: string;
    email: string;
  };
  direccion: string;
  ciudad: string;
  codeudor?: {
    nombre: string;
    cedula: string;
  };
}

const CREDITS: CreditInfo[] = [
  {
    codigo: 'CR001',
    deudor: { nombre: 'Camilo Vela', cedula: '80028033', telefono: '3142182990', email: 'velaasociados@outlook.com' },
    direccion: '', ciudad: 'Bogotá',
  },
  {
    codigo: 'CR002',
    deudor: { nombre: 'Jesus Giraldo', cedula: '9993416', telefono: '3058600540', email: 'jesusgiraldo1271@gmail.com' },
    direccion: 'Cra 107Bis B #72-52', ciudad: 'Bogotá',
  },
  {
    codigo: 'CR003',
    deudor: { nombre: 'Sandra Valdes', cedula: '1022332972', telefono: '3202952034', email: 'sandravaldesromana@gmail.com' },
    direccion: 'Calle 68c SUR #80m-77', ciudad: 'Bogotá',
  },
  {
    codigo: 'CR004',
    deudor: { nombre: 'Juan Ramiro Gomez', cedula: '1121948333', telefono: '3204326725', email: 'juanrgomezm97@gmail.com' },
    direccion: 'Calle 39e # 26-42', ciudad: 'Villavicencio',
  },
  {
    codigo: 'CR005',
    deudor: { nombre: 'Hugo Sebastian Lozano', cedula: '1022410687', telefono: '3182549461', email: 'husebasll@gmail.com' },
    direccion: 'Calle 2 # 1c - 00', ciudad: 'Chia',
    codeudor: { nombre: 'Juana Valentina Castillo', cedula: '1007635301' },
  },
  {
    codigo: 'CR006',
    deudor: { nombre: 'Benjamin Rodriguez', cedula: '1014308339', telefono: '3138844238', email: 'benjaminrdra@gmail.com' },
    direccion: 'Cra 9 # 161-45', ciudad: 'Bogotá',
    codeudor: { nombre: 'Nohora Catalina Rodriguez', cedula: '1015471952' },
  },
  {
    codigo: 'CR007',
    deudor: { nombre: 'Jhon Lozano', cedula: '11320275', telefono: '3218259097', email: 'robinsonlozano2@gmail.com' },
    direccion: 'Urbanizacion la Esperanza casa 3', ciudad: 'Girardot',
  },
  {
    codigo: 'CR008',
    deudor: { nombre: 'William Quintero', cedula: '80410430', telefono: '3012734601', email: 'negocios.w@gmail.com' },
    direccion: 'Lote de terreno denominado Lurdes ubicado en la vereda soche Granada', ciudad: 'Granada',
    codeudor: { nombre: 'Maria Isabele Ferreira', cedula: '28852955' },
  },
  {
    codigo: 'CR009',
    deudor: { nombre: 'Construcciones Rodriguez', cedula: '830063013', telefono: '3102312252', email: 'gerencia@rcltda.com' },
    direccion: 'Calle 140 # 16a-35', ciudad: 'Bogotá',
    codeudor: { nombre: 'Daniel Rodriguez', cedula: '80434623' },
  },
  {
    codigo: 'CR010',
    deudor: { nombre: 'Alejandro Rincon', cedula: '80795903', telefono: '3125521149', email: 'alejo2020rincon@gmail.com' },
    direccion: 'Calle 37 Bis SUR # 51f-53', ciudad: 'Bogotá',
    codeudor: { nombre: 'Angela Viviana Moreno', cedula: '52888487' },
  },
  {
    codigo: 'CR011',
    deudor: { nombre: 'Miguel Rojas', cedula: '1023864902', telefono: '3138203186', email: 'miguelarb.8696@gmail.com' },
    direccion: 'Finca el Caucho vereda Santa Ana', ciudad: 'Ubaqué',
  },
  {
    codigo: 'CR012',
    deudor: { nombre: 'Jorge Humberto Alzate', cedula: '13822638', telefono: '3105050338', email: 'cesargus4@gmail.com' },
    direccion: 'Calle 19sur # 69 - 55 int 10 apto 101', ciudad: 'Bogotá',
    codeudor: { nombre: 'Cesar Alzate', cedula: '3012663343' },
  },
  {
    codigo: 'CR013',
    deudor: { nombre: 'Edwin Bernal', cedula: '80063413', telefono: '3183497538', email: 'edwbemo@gmail.com' },
    direccion: 'Cra 111a # 45-60 casa 58', ciudad: 'Bogotá',
    codeudor: { nombre: 'Merlen Paola Poloche', cedula: '28559278' },
  },
  {
    codigo: 'CR014',
    deudor: { nombre: 'Construcciones Vela', cedula: '901838123', telefono: '3142182990', email: 'velaasociados@outlook.com' },
    direccion: 'Cra 93 #75 - 51', ciudad: 'Bogota',
  },
  {
    codigo: 'CR015',
    deudor: { nombre: 'Guillermo de Backer', cedula: '80527933', telefono: '3115618055', email: 'guillermodebacker.gdb@gmail.com' },
    direccion: 'Finca Villa Ligia, vereda el Estanco, municipio de Tenjo', ciudad: 'Tenjo',
  },
  {
    codigo: 'CR016',
    deudor: { nombre: 'Francisco Alonso Cardona', cedula: '71791494', telefono: '3103103211', email: 'francisco.cardona287@gmail.com' },
    direccion: 'Cra 95 # 65 - 49', ciudad: 'Bogota',
  },
  {
    codigo: 'CR017',
    deudor: { nombre: 'Janeth Forero', cedula: '51982339', telefono: '3107124092', email: 'mutaahhit@hotmail.com' },
    direccion: 'Casa 91 manzana 12 conjunto la arboleda', ciudad: 'Girardot',
  },
  {
    codigo: 'CR018',
    deudor: { nombre: 'Holding Club Cybercard', cedula: '901503203', telefono: '3022991583', email: 'directorejectutivo@cybercard.com.co' },
    direccion: 'Calle 20 # 16a - 17 Edif. Solei apto 901', ciudad: 'Cartagena',
  },
  {
    codigo: 'CR019',
    deudor: { nombre: 'Holding Club Cybercard', cedula: '901503203', telefono: '3022991583', email: 'directorejectutivo@cybercard.com.co' },
    direccion: 'Calle 20 # 16a - 17 Edif. Solei apto 1001', ciudad: 'Cartagena',
  },
  {
    codigo: 'CR020',
    deudor: { nombre: 'Giovanni Orlando Sotelo Ramirez', cedula: '80540742', telefono: '3114715852', email: 'giovasotelo14@hotmail.com' },
    direccion: 'CALLE 6 # 1 -71 interior 8, barandillas Zipaquira', ciudad: 'Zipaquira',
    codeudor: { nombre: 'William Gonzalo Sotelo Ramirez', cedula: '11346437' },
  },
  {
    codigo: 'CR021',
    deudor: { nombre: 'Miguel Angel Molina Perez', cedula: '1024494152', telefono: '3125752217', email: 'miguel.molina2592@correo.policia.gov.co' },
    direccion: 'Dg 34 SUR # 68B - 23', ciudad: 'Bogotá',
    codeudor: { nombre: 'Nelson Urrego', cedula: '1058324823' },
  },
  {
    codigo: 'CR022',
    deudor: { nombre: 'Jorge Humberto Alzate', cedula: '13822638', telefono: '3105050338', email: 'cesargus4@gmail.com' },
    direccion: 'Calle 19sur # 69 - 55 int 10 apto 101', ciudad: 'Bogotá',
    codeudor: { nombre: 'Cesar Alzate', cedula: '3012663343' },
  },
  {
    codigo: 'CR023',
    deudor: { nombre: 'Poblado Corp. Group SAS', cedula: '901709643-9', telefono: '3107515271', email: 'pobladocp@gmail.com' },
    direccion: 'CRA 23 # 142 - 52 apto 301', ciudad: 'Bogotá',
  },
  {
    codigo: 'CR024',
    deudor: { nombre: 'Laura Beltran', cedula: '1079263381', telefono: '3108106061', email: 'beltrancacereslaura@gmail.com' },
    direccion: 'AV CRA 30 # 75 -65 ofic 307', ciudad: 'Bogotá',
    codeudor: { nombre: 'Oscar Guillen', cedula: '1018428445' },
  },
  {
    codigo: 'CR025',
    deudor: { nombre: 'Rooted House', cedula: '901546123', telefono: '3123404037', email: 'gerencia@rootedhouse.com.co' },
    direccion: 'Calle 163 #8 -26', ciudad: 'Bogotá',
  },
  {
    codigo: 'CR026',
    deudor: { nombre: 'Robeiro Osorio Galeano', cedula: '79976633', telefono: '3026470299', email: 'robeiroosoriogaleano@gmail.com' },
    direccion: 'Calle 70a Sur 17 - 50 Este', ciudad: 'Bogota',
    codeudor: { nombre: 'Yuliana Katherine Torres Garzon', cedula: '1078827957' },
  },
];

async function run() {
  console.log(`=== Actualizando info de creditos ${DRY_RUN ? '(DRY RUN)' : ''} ===\n`);

  let creditosUpdated = 0;
  let profilesUpdated = 0;
  let codeudoresLinked = 0;
  let errors = 0;

  for (const cr of CREDITS) {
    console.log(`\n--- ${cr.codigo} ---`);

    // 1. Find the credit by codigo_credito
    const { data: credito, error: findErr } = await supabase
      .from('creditos')
      .select('id, cliente_id, co_deudor_id, direccion_inmueble, ciudad_inmueble')
      .eq('codigo_credito', cr.codigo)
      .single();

    if (findErr || !credito) {
      console.error(`  ✗ Credito ${cr.codigo} no encontrado: ${findErr?.message}`);
      errors++;
      continue;
    }

    // 2. Update direccion_inmueble & ciudad_inmueble
    const creditUpdate: Record<string, string> = {};
    if (cr.direccion) creditUpdate.direccion_inmueble = cr.direccion;
    creditUpdate.ciudad_inmueble = cr.ciudad;

    if (Object.keys(creditUpdate).length > 0) {
      if (DRY_RUN) {
        console.log(`  [DRY] Credito: ${JSON.stringify(creditUpdate)}`);
      } else {
        const { error: updErr } = await supabase
          .from('creditos')
          .update(creditUpdate)
          .eq('id', credito.id);
        if (updErr) {
          console.error(`  ✗ Error actualizando credito: ${updErr.message}`);
          errors++;
        } else {
          console.log(`  ✓ Credito actualizado (dir: ${cr.direccion || 'sin cambio'}, ciudad: ${cr.ciudad})`);
          creditosUpdated++;
        }
      }
    }

    // 3. Update deudor profile
    if (credito.cliente_id) {
      const profileUpdate = {
        full_name: cr.deudor.nombre,
        document_id: cr.deudor.cedula,
        phone: cr.deudor.telefono,
      };

      if (DRY_RUN) {
        console.log(`  [DRY] Deudor profile (${credito.cliente_id.substring(0, 8)}): ${JSON.stringify(profileUpdate)}`);
      } else {
        const { error: profErr } = await supabase
          .from('profiles')
          .update(profileUpdate)
          .eq('id', credito.cliente_id);
        if (profErr) {
          console.error(`  ✗ Error actualizando profile deudor: ${profErr.message}`);
          errors++;
        } else {
          console.log(`  ✓ Deudor: ${cr.deudor.nombre} (${cr.deudor.cedula})`);
          profilesUpdated++;
        }
      }
    }

    // 4. Handle co-deudor
    if (cr.codeudor) {
      // Check if co_deudor already exists by document_id
      const { data: existingCo } = await supabase
        .from('profiles')
        .select('id')
        .eq('document_id', cr.codeudor.cedula)
        .single();

      if (existingCo) {
        // Link existing co-deudor
        if (DRY_RUN) {
          console.log(`  [DRY] Codeudor ya existe (${existingCo.id.substring(0, 8)}), vinculando`);
        } else {
          // Update the co-deudor name just in case
          await supabase
            .from('profiles')
            .update({ full_name: cr.codeudor.nombre })
            .eq('id', existingCo.id);

          const { error: linkErr } = await supabase
            .from('creditos')
            .update({ co_deudor_id: existingCo.id })
            .eq('id', credito.id);
          if (linkErr) {
            console.error(`  ✗ Error vinculando codeudor: ${linkErr.message}`);
            errors++;
          } else {
            console.log(`  ✓ Codeudor vinculado: ${cr.codeudor.nombre} (${cr.codeudor.cedula})`);
            codeudoresLinked++;
          }
        }
      } else {
        // Create co-deudor: auth user + profile
        if (DRY_RUN) {
          console.log(`  [DRY] Crear codeudor: ${cr.codeudor.nombre} (${cr.codeudor.cedula})`);
        } else {
          const coEmail = `codeudor_${cr.codeudor.cedula}@placeholder.local`;
          const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
            email: coEmail,
            password: `Temp${cr.codeudor.cedula}!`,
            email_confirm: true,
            user_metadata: {
              full_name: cr.codeudor.nombre,
              document_id: cr.codeudor.cedula,
              role: 'propietario',
            },
          });

          let coUserId: string | undefined;

          if (authErr) {
            if (authErr.message.includes('already') || authErr.message.includes('registered')) {
              // Find existing by email
              const { data: existingProfile } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', coEmail)
                .single();
              if (existingProfile) {
                coUserId = existingProfile.id;
                console.log(`  (i) Auth user ya existe para codeudor, usando existente`);
              }
            }
            if (!coUserId) {
              console.error(`  ✗ Error creando auth user codeudor: ${authErr.message}`);
              errors++;
            }
          } else {
            coUserId = authData.user.id;
            // Create profile
            await supabase.from('profiles').insert({
              id: coUserId,
              email: coEmail,
              full_name: cr.codeudor.nombre,
              document_id: cr.codeudor.cedula,
              role: 'propietario',
            });
          }

          if (coUserId) {
            // Update profile name just in case
            await supabase.from('profiles')
              .update({ full_name: cr.codeudor.nombre, document_id: cr.codeudor.cedula })
              .eq('id', coUserId);

            const { error: linkErr } = await supabase
              .from('creditos')
              .update({ co_deudor_id: coUserId })
              .eq('id', credito.id);
            if (linkErr) {
              console.error(`  ✗ Error vinculando codeudor: ${linkErr.message}`);
              errors++;
            } else {
              console.log(`  ✓ Codeudor creado y vinculado: ${cr.codeudor.nombre} (${cr.codeudor.cedula})`);
              codeudoresLinked++;
            }
          }
        }
      }
    }
  }

  console.log(`\n=== Resumen ${DRY_RUN ? '(DRY RUN)' : ''} ===`);
  console.log(`Creditos actualizados: ${creditosUpdated}`);
  console.log(`Profiles deudor actualizados: ${profilesUpdated}`);
  console.log(`Codeudores vinculados/creados: ${codeudoresLinked}`);
  console.log(`Errores: ${errors}`);
}

run().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
