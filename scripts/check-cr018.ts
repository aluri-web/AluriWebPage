import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const { data: credit } = await supabase
    .from('creditos')
    .select('id, codigo_credito, valor_colocado, monto_solicitado, tasa_nominal, fecha_desembolso, tipo_liquidacion, tipo_amortizacion')
    .eq('codigo_credito', 'CR018')
    .single();

  console.log('=== CR018 ===');
  console.log('valor_colocado:', credit!.valor_colocado);
  console.log('monto_solicitado:', credit!.monto_solicitado);
  console.log('tasa_nominal:', credit!.tasa_nominal, '%');
  console.log('fecha_desembolso:', credit!.fecha_desembolso);
  console.log('tipo_liquidacion:', credit!.tipo_liquidacion);
  console.log('tipo_amortizacion:', credit!.tipo_amortizacion);

  const { data: txs } = await supabase
    .from('transacciones')
    .select('*')
    .eq('credito_id', credit!.id)
    .order('fecha_aplicacion');

  console.log('\n--- Transacciones ---');
  let totalInt = 0;
  let totalCap = 0;
  for (const t of txs || []) {
    console.log(`  ${t.fecha_aplicacion} | ${t.tipo_transaccion} | $${Number(t.monto).toLocaleString()} | ${t.concepto}`);
    if (t.tipo_transaccion === 'pago_interes') totalInt += Number(t.monto);
    if (t.tipo_transaccion === 'pago_capital') totalCap += Number(t.monto);
  }
  console.log(`  TOTAL: intereses=$${totalInt.toLocaleString()}, capital=$${totalCap.toLocaleString()}`);

  const { data: invs } = await supabase
    .from('inversiones')
    .select('monto_invertido, porcentaje_participacion, inversionista:profiles!inversionista_id(full_name)')
    .eq('credito_id', credit!.id);

  console.log('\n--- Inversiones & Pro-rata ---');
  for (const i of invs || []) {
    const name = (i.inversionista as any)?.full_name;
    const share = Number(i.monto_invertido) / Number(credit!.monto_solicitado);
    console.log(`  ${name}: ${i.porcentaje_participacion}%, monto=$${Number(i.monto_invertido).toLocaleString()}`);
    console.log(`    share=${(share * 100).toFixed(2)}%, intereses_prorata=$${Math.round(totalInt * share).toLocaleString()}, capital_prorata=$${Math.round(totalCap * share).toLocaleString()}`);
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
