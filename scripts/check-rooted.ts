import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
async function main() {
  const { data: p1 } = await s.from('profiles').select('id, full_name, email, document_id').ilike('email', '%rootedhouse%');
  console.log('rootedhouse:', JSON.stringify(p1, null, 2));
  const { data: p2 } = await s.from('profiles').select('id, full_name, email, document_id').eq('document_id', '901546123');
  console.log('901546123:', JSON.stringify(p2, null, 2));
  const { data: p3 } = await s.from('profiles').select('id, full_name, email, document_id').ilike('email', '%temp_fix%');
  console.log('temp_fix profiles:', JSON.stringify(p3, null, 2));
  const { data: p4 } = await s.from('profiles').select('id, full_name, email, document_id').ilike('full_name', '%Racing%');
  console.log('Racing:', JSON.stringify(p4, null, 2));
  const { data: p5 } = await s.from('profiles').select('id, full_name, email, document_id').ilike('full_name', '%Rooted%');
  console.log('Rooted:', JSON.stringify(p5, null, 2));
}
main();
