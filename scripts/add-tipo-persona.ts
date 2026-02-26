import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const { error } = await supabase.rpc('exec_sql', {
    sql: `ALTER TABLE creditos ADD COLUMN IF NOT EXISTS tipo_persona VARCHAR(20) DEFAULT 'natural' CHECK (tipo_persona IN ('natural', 'juridica'));`
  });

  if (error) {
    // If rpc doesn't work, try direct approach
    console.log('RPC failed, trying direct SQL via REST...');
    console.error(error.message);
    console.log('\nPlease run this SQL manually in Supabase SQL Editor:');
    console.log(`ALTER TABLE creditos ADD COLUMN IF NOT EXISTS tipo_persona VARCHAR(20) DEFAULT 'natural' CHECK (tipo_persona IN ('natural', 'juridica'));`);
  } else {
    console.log('Column tipo_persona added successfully.');
  }
}

main();
