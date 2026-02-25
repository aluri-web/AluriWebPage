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
// DATA: Inversionistas por crédito (del CSV)
// =====================================================

interface InvestorEntry {
  nombre: string;
  porcentaje: number; // 0-100
}

interface CreditInvestors {
  codigo: string;
  valor_colocado: number;
  inversiones: InvestorEntry[];
}

const CREDITS: CreditInvestors[] = [
  {
    codigo: 'CR001', valor_colocado: 200000000,
    inversiones: [{ nombre: 'Ana Lucia Contreras', porcentaje: 100 }],
  },
  {
    codigo: 'CR002', valor_colocado: 220000000,
    inversiones: [{ nombre: 'Ana Lucia Contreras', porcentaje: 100 }],
  },
  {
    codigo: 'CR003', valor_colocado: 50000000,
    inversiones: [
      { nombre: 'Juan Pablo Malaver', porcentaje: 50 },
      { nombre: 'Sergio Andres Velandia', porcentaje: 50 },
    ],
  },
  {
    codigo: 'CR004', valor_colocado: 100000000,
    inversiones: [{ nombre: 'Oscar Mauricio Zapata', porcentaje: 100 }],
  },
  {
    codigo: 'CR005', valor_colocado: 120000000,
    inversiones: [
      { nombre: 'Oscar Mauricio Zapata', porcentaje: 50 },
      { nombre: 'Juan Pablo Malaver', porcentaje: 50 },
    ],
  },
  {
    codigo: 'CR006', valor_colocado: 143000000,
    inversiones: [
      { nombre: 'Oscar Mauricio Zapata', porcentaje: 50 },
      { nombre: 'Juan Pablo Malaver', porcentaje: 50 },
    ],
  },
  {
    codigo: 'CR007', valor_colocado: 35000000,
    inversiones: [{ nombre: 'Sergio Andres Velandia', porcentaje: 100 }],
  },
  {
    codigo: 'CR008', valor_colocado: 80000000,
    inversiones: [{ nombre: 'Sergio Andres Velandia', porcentaje: 100 }],
  },
  {
    codigo: 'CR009', valor_colocado: 100000000,
    inversiones: [{ nombre: 'Ana Lucia Contreras', porcentaje: 100 }],
  },
  {
    codigo: 'CR010', valor_colocado: 160000000,
    inversiones: [
      { nombre: 'Sergio Andres Velandia', porcentaje: 33.33 },
      { nombre: 'Juan Pablo Malaver', porcentaje: 33.33 },
      { nombre: 'Luis Miguel Centanaro', porcentaje: 33.33 },
    ],
  },
  {
    codigo: 'CR011', valor_colocado: 200000000,
    inversiones: [{ nombre: 'Fanny Asencio Serna', porcentaje: 100 }],
  },
  {
    codigo: 'CR012', valor_colocado: 40000000,
    inversiones: [{ nombre: 'Sergio Andres Velandia', porcentaje: 100 }],
  },
  {
    codigo: 'CR013', valor_colocado: 140000000,
    inversiones: [{ nombre: 'Fanny Asencio Serna', porcentaje: 100 }],
  },
  {
    codigo: 'CR014', valor_colocado: 206000000,
    inversiones: [{ nombre: 'Fanny Asencio Serna', porcentaje: 100 }],
  },
  {
    codigo: 'CR015', valor_colocado: 80000000,
    inversiones: [{ nombre: 'Carlos Eduardo Londono', porcentaje: 100 }],
  },
  {
    codigo: 'CR016', valor_colocado: 40000000,
    inversiones: [{ nombre: 'Camila Manrique', porcentaje: 100 }],
  },
  {
    codigo: 'CR017', valor_colocado: 100000000,
    inversiones: [{ nombre: 'Javier Arnulfo Rivera', porcentaje: 100 }],
  },
  {
    codigo: 'CR018', valor_colocado: 475000000,
    inversiones: [
      { nombre: 'Oscar Fabian Tarazona', porcentaje: 50 },
      { nombre: 'German Andres Cajamarca Castro', porcentaje: 50 },
    ],
  },
  {
    codigo: 'CR019', valor_colocado: 475000000,
    inversiones: [
      { nombre: 'Edgar Orlando Velasco', porcentaje: 50 },
      { nombre: 'Hector Hernandez Parra', porcentaje: 50 },
    ],
  },
  {
    codigo: 'CR020', valor_colocado: 50000000,
    inversiones: [{ nombre: 'Sergio Andres Velandia', porcentaje: 100 }],
  },
  {
    codigo: 'CR021', valor_colocado: 300000000,
    inversiones: [
      { nombre: 'Diego Barragan', porcentaje: 25 },
      { nombre: 'Daniel Barragan', porcentaje: 25 },
      { nombre: 'Manuel Pinilla', porcentaje: 33.33 },
      { nombre: 'Oscar Fabian Tarazona', porcentaje: 16.67 },
    ],
  },
  {
    codigo: 'CR022', valor_colocado: 350000000,
    inversiones: [
      { nombre: 'Manuel Barrera', porcentaje: 28.57 },
      { nombre: 'Carlos Mario Ruiz', porcentaje: 21.43 },
      { nombre: 'Sergio Andres Velandia', porcentaje: 21.43 },
      { nombre: 'Oscar Fabian Tarazona', porcentaje: 28.57 },
    ],
  },
  {
    codigo: 'CR023', valor_colocado: 50000000,
    inversiones: [{ nombre: 'Diego Chacon Malagon', porcentaje: 100 }],
  },
  // CR024: investors listed but NO percentages in CSV — skipping until clarified
  {
    codigo: 'CR025', valor_colocado: 80000000,
    inversiones: [
      { nombre: 'Manuel Pinilla', porcentaje: 75 },
      { nombre: 'Oscar Fabian Tarazona', porcentaje: 25 },
    ],
  },
  {
    codigo: 'CR026', valor_colocado: 67000000,
    inversiones: [{ nombre: 'Sergio Andres Velandia', porcentaje: 100 }],
  },
  {
    codigo: 'CR027', valor_colocado: 55000000,
    inversiones: [
      { nombre: 'Sergio Andres Velandia', porcentaje: 80 },
      { nombre: 'Jonathan Cetina Cuellar', porcentaje: 20 },
    ],
  },
  // CR028: Nicolas Zapata listed but NO percentage — skipping until clarified
];

// Cache: investor name -> profile id
const investorCache = new Map<string, string>();

async function findOrCreateInvestor(nombre: string): Promise<string | null> {
  // Check cache
  const cached = investorCache.get(nombre);
  if (cached) return cached;

  // Search by full_name + role
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('full_name', nombre)
    .eq('role', 'inversionista')
    .limit(1);

  if (existing && existing.length > 0) {
    investorCache.set(nombre, existing[0].id);
    return existing[0].id;
  }

  // Search by full_name only (might have different role but we want to find them)
  const { data: anyProfile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('full_name', nombre)
    .limit(1);

  if (anyProfile && anyProfile.length > 0) {
    console.log(`    (!) Perfil encontrado con role='${anyProfile[0].role}', usando existente`);
    investorCache.set(nombre, anyProfile[0].id);
    return anyProfile[0].id;
  }

  if (DRY_RUN) {
    console.log(`    [DRY] Crear perfil inversionista: ${nombre}`);
    return 'dry-run-id';
  }

  // Create auth user + profile
  const sanitized = nombre.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
  const invEmail = `inv_${sanitized}@placeholder.local`;

  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: invEmail,
    password: `TempInv${Date.now()}!`,
    email_confirm: true,
    user_metadata: { full_name: nombre, role: 'inversionista' },
  });

  let userId: string | undefined;

  if (authErr) {
    if (authErr.message.includes('already') || authErr.message.includes('registered')) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', invEmail)
        .single();
      if (existingProfile) {
        userId = existingProfile.id;
        console.log(`    (i) Auth user ya existe, usando existente`);
      }
    }
    if (!userId) {
      console.error(`    ✗ Error creando auth user: ${authErr.message}`);
      return null;
    }
  } else {
    userId = authData.user.id;
    // Create profile
    const { error: profErr } = await supabase.from('profiles').insert({
      id: userId,
      email: invEmail,
      full_name: nombre,
      role: 'inversionista',
    });
    if (profErr) {
      console.error(`    ✗ Error creando perfil: ${profErr.message}`);
      return null;
    }
    console.log(`    ✓ Perfil creado: ${nombre} (${userId.substring(0, 8)}...)`);
  }

  if (userId) {
    investorCache.set(nombre, userId);
  }
  return userId || null;
}

async function run() {
  console.log(`=== Actualizando inversiones ${DRY_RUN ? '(DRY RUN)' : ''} ===\n`);

  let inversionesCreated = 0;
  let inversionesUpdated = 0;
  let profilesCreated = 0;
  let errors = 0;

  for (const cr of CREDITS) {
    console.log(`\n--- ${cr.codigo} ---`);

    // Find the credit
    const { data: credito, error: findErr } = await supabase
      .from('creditos')
      .select('id')
      .eq('codigo_credito', cr.codigo)
      .single();

    if (findErr || !credito) {
      console.error(`  ✗ Credito ${cr.codigo} no encontrado: ${findErr?.message}`);
      errors++;
      continue;
    }

    for (const inv of cr.inversiones) {
      const monto = Math.round(cr.valor_colocado * inv.porcentaje / 100);
      console.log(`  ${inv.nombre}: ${inv.porcentaje}% = $${(monto / 1e6).toFixed(1)}M`);

      // Find or create investor profile
      const investorId = await findOrCreateInvestor(inv.nombre);
      if (!investorId) {
        errors++;
        continue;
      }

      if (DRY_RUN) {
        console.log(`    [DRY] Inversion: credito=${credito.id.substring(0, 8)}, monto=${monto}, pct=${inv.porcentaje}`);
        continue;
      }

      // Check if inversion already exists
      const { data: existingInv } = await supabase
        .from('inversiones')
        .select('id')
        .eq('credito_id', credito.id)
        .eq('inversionista_id', investorId)
        .limit(1);

      if (existingInv && existingInv.length > 0) {
        // Update existing
        const { error: updErr } = await supabase
          .from('inversiones')
          .update({
            monto_invertido: monto,
            porcentaje_participacion: inv.porcentaje,
            estado: 'activo',
          })
          .eq('id', existingInv[0].id);

        if (updErr) {
          console.error(`    ✗ Error actualizando inversion: ${updErr.message}`);
          errors++;
        } else {
          console.log(`    ✓ Inversion actualizada`);
          inversionesUpdated++;
        }
      } else {
        // Create new
        const { error: createErr } = await supabase
          .from('inversiones')
          .insert({
            credito_id: credito.id,
            inversionista_id: investorId,
            monto_invertido: monto,
            porcentaje_participacion: inv.porcentaje,
            estado: 'activo',
          });

        if (createErr) {
          console.error(`    ✗ Error creando inversion: ${createErr.message}`);
          errors++;
        } else {
          console.log(`    ✓ Inversion creada`);
          inversionesCreated++;
        }
      }
    }
  }

  console.log(`\n=== Resumen ${DRY_RUN ? '(DRY RUN)' : ''} ===`);
  console.log(`Inversiones creadas: ${inversionesCreated}`);
  console.log(`Inversiones actualizadas: ${inversionesUpdated}`);
  console.log(`Errores: ${errors}`);
  console.log(`\n⚠ NOTA: CR024 y CR028 omitidos por falta de porcentajes en el CSV.`);
}

run().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
