import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  // 1. Find CR027
  const { data: credito, error: findError } = await supabase
    .from('creditos')
    .select('id, codigo_credito')
    .eq('codigo_credito', 'CR027')
    .single();

  if (findError || !credito) {
    console.log('CR027 no encontrado en la base de datos.');
    return;
  }

  console.log(`CR027 encontrado: id=${credito.id}`);

  // 2. Delete transacciones
  const { count: txCount, error: txError } = await supabase
    .from('transacciones')
    .delete({ count: 'exact' })
    .eq('credito_id', credito.id);

  if (txError) console.error('Error eliminando transacciones:', txError.message);
  else console.log(`Transacciones eliminadas: ${txCount || 0}`);

  // 3. Delete causaciones_inversionistas (if any)
  const { count: causCount, error: causError } = await supabase
    .from('causaciones_inversionistas')
    .delete({ count: 'exact' })
    .eq('credito_id', credito.id);

  if (causError && !causError.message.includes('does not exist')) {
    console.error('Error eliminando causaciones:', causError.message);
  } else {
    console.log(`Causaciones eliminadas: ${causCount || 0}`);
  }

  // 4. Delete inversiones
  const { count: invCount, error: invError } = await supabase
    .from('inversiones')
    .delete({ count: 'exact' })
    .eq('credito_id', credito.id);

  if (invError) console.error('Error eliminando inversiones:', invError.message);
  else console.log(`Inversiones eliminadas: ${invCount || 0}`);

  // 5. Delete the credit itself
  const { error: delError } = await supabase
    .from('creditos')
    .delete()
    .eq('id', credito.id);

  if (delError) console.error('Error eliminando CR027:', delError.message);
  else console.log('CR027 eliminado exitosamente.');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
