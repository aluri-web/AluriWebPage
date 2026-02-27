import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

async function main() {
  const { data: cr } = await s.from('creditos').select('id').eq('codigo_credito', 'CR027').single();
  if (!cr) { console.log('CR027 not found'); return; }

  // Delete plan_pagos
  const { count: ppCount, error: ppErr } = await s.from('plan_pagos').delete({ count: 'exact' }).eq('credito_id', cr.id);
  console.log('plan_pagos deleted:', ppCount, ppErr?.message || '');

  // Delete transacciones
  const { count: txCount, error: txErr } = await s.from('transacciones').delete({ count: 'exact' }).eq('credito_id', cr.id);
  console.log('transacciones deleted:', txCount, txErr?.message || '');

  // Delete inversiones
  const { count: invCount, error: invErr } = await s.from('inversiones').delete({ count: 'exact' }).eq('credito_id', cr.id);
  console.log('inversiones deleted:', invCount, invErr?.message || '');

  // Delete credit
  const { error: crErr } = await s.from('creditos').delete().eq('id', cr.id);
  console.log('CR027 deleted:', crErr?.message || 'OK ✓');
}
main();
