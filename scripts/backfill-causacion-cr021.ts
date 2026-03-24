/**
 * Backfill de causación diaria para CR021 con 2 pagos
 *
 * Paso 1: Causar 2026-01-22 → 2026-02-23
 * Paso 2: Pago $8,294,500 el 2026-02-23
 * Paso 3: Causar 2026-02-24 → 2026-03-22
 * Paso 4: Pago $8,294,431 el 2026-03-22
 * Paso 5: Causar 2026-03-23 → 2026-03-25
 *
 * Uso: npx tsx scripts/backfill-causacion-cr021.ts
 */
import { createClient } from '@supabase/supabase-js';
import { procesarCausacionCredito } from '../src/lib/interest/calculator';
import type { Credito } from '../src/lib/interest/types';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const CREDITO_CODE = 'CR021';

async function getCredito() {
  const { data } = await supabase.from('creditos').select('*').eq('codigo_credito', CREDITO_CODE).single();
  return data;
}

async function causarRango(desde: string, hasta: string, label: string) {
  const fechaInicio = new Date(desde);
  const fechaFin = new Date(hasta);
  const totalDias = Math.floor((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  console.log(`\n--- ${label}: ${desde} → ${hasta} (${totalDias} días) ---`);

  let totalInteres = 0;
  let totalMora = 0;
  let errores = 0;

  const fecha = new Date(fechaInicio);
  let diaNum = 0;
  while (fecha <= fechaFin) {
    diaNum++;
    const fechaStr = fecha.toISOString().split('T')[0];

    const credito = await getCredito();
    if (!credito) { console.error(`Error obteniendo crédito`); break; }

    const resultado = await procesarCausacionCredito(supabase, credito as Credito, fechaStr);

    if (resultado.error) {
      console.error(`  ❌ ${fechaStr}: ${resultado.error}`);
      errores++;
    } else {
      totalInteres += resultado.interesCausado;
      totalMora += resultado.moraCausada;

      if (diaNum % 10 === 0 || diaNum === 1 || fecha.getTime() === fechaFin.getTime()) {
        console.log(`  ✓ ${fechaStr} (${diaNum}/${totalDias}): Int=$${resultado.interesCausado.toLocaleString()}, Mora=$${resultado.moraCausada.toLocaleString()}`);
      }
    }

    fecha.setDate(fecha.getDate() + 1);
  }

  console.log(`  Subtotal: Int=$${totalInteres.toLocaleString()}, Mora=$${totalMora.toLocaleString()}, Errores=${errores}`);
  return { totalInteres, totalMora, errores };
}

async function registrarPago(monto: number, fecha: string, referencia: string) {
  const credito = await getCredito();
  if (!credito) { console.error('Crédito no encontrado'); return; }

  let saldoMora = credito.saldo_mora || 0;
  let saldoIntereses = credito.saldo_intereses || 0;
  let saldoCapital = credito.saldo_capital || 0;
  let restante = monto;

  // Cascada: mora → intereses → capital
  const abonoMora = Math.min(restante, saldoMora);
  restante -= abonoMora;
  const abonoIntereses = Math.min(restante, saldoIntereses);
  restante -= abonoIntereses;
  const abonoCapital = restante;

  console.log(`\n--- PAGO $${monto.toLocaleString()} (${fecha}) [${referencia}] ---`);
  console.log(`  Saldos antes: Cap=$${saldoCapital.toLocaleString()}, Int=$${saldoIntereses.toLocaleString()}, Mora=$${saldoMora.toLocaleString()}`);
  console.log(`  Distribución: Mora=$${abonoMora.toLocaleString()}, Int=$${abonoIntereses.toLocaleString()}, Cap=$${abonoCapital.toLocaleString()}`);

  const txns = [];
  if (abonoMora > 0) txns.push({ credito_id: credito.id, tipo_transaccion: 'pago_mora', monto: abonoMora, fecha_aplicacion: fecha, fecha_transaccion: fecha, referencia_pago: referencia });
  if (abonoIntereses > 0) txns.push({ credito_id: credito.id, tipo_transaccion: 'pago_interes', monto: abonoIntereses, fecha_aplicacion: fecha, fecha_transaccion: fecha, referencia_pago: referencia });
  if (abonoCapital > 0) txns.push({ credito_id: credito.id, tipo_transaccion: 'pago_capital', monto: abonoCapital, fecha_aplicacion: fecha, fecha_transaccion: fecha, referencia_pago: referencia });

  const { error: txError } = await supabase.from('transacciones').insert(txns);
  if (txError) { console.error('Error insertando transacciones:', txError); return; }

  const nuevoCapital = saldoCapital - abonoCapital;
  const nuevosIntereses = saldoIntereses - abonoIntereses;
  const nuevaMora = saldoMora - abonoMora;

  const { error: updateError } = await supabase
    .from('creditos')
    .update({
      saldo_capital: nuevoCapital,
      saldo_intereses: nuevosIntereses,
      saldo_mora: nuevaMora,
      fecha_ultimo_pago: fecha
    })
    .eq('id', credito.id);

  if (updateError) { console.error('Error actualizando crédito:', updateError); return; }

  console.log(`  ✓ Nuevos saldos: Cap=$${nuevoCapital.toLocaleString()}, Int=$${nuevosIntereses.toLocaleString()}, Mora=$${nuevaMora.toLocaleString()}`);
}

async function main() {
  const credito = await getCredito();
  if (!credito) { console.error('CR021 no encontrado'); return; }

  console.log('=== Backfill CR021 con 2 pagos ===');
  console.log(`Capital: $${credito.saldo_capital.toLocaleString()}`);
  console.log(`Desembolso: ${credito.fecha_desembolso}`);
  console.log(`Tasa EA: ${credito.tasa_interes_ea}%`);
  console.log(`Tipo: ${credito.tipo_amortizacion} / ${credito.tipo_liquidacion}`);

  // PASO 1: Causar hasta primer pago
  await causarRango('2026-01-22', '2026-02-23', 'PASO 1: Causación pre-pago 1');

  // PASO 2: Primer pago
  await registrarPago(8294500, '2026-02-23', 'PAG-CR021-20260223');

  // PASO 3: Causar hasta segundo pago
  await causarRango('2026-02-24', '2026-03-22', 'PASO 3: Causación pre-pago 2');

  // PASO 4: Segundo pago
  await registrarPago(8294431, '2026-03-22', 'PAG-CR021-20260322');

  // PASO 5: Causar hasta hoy
  await causarRango('2026-03-23', '2026-03-25', 'PASO 5: Causación post-pago 2');

  // Estado final
  const final = await getCredito();
  console.log('\n=== ESTADO FINAL CR021 ===');
  console.log(`Capital real: $${final!.saldo_capital.toLocaleString()}`);
  console.log(`Capital esperado: $${final!.saldo_capital_esperado.toLocaleString()}`);
  console.log(`Intereses: $${final!.saldo_intereses.toLocaleString()}`);
  console.log(`Mora: $${final!.saldo_mora.toLocaleString()}`);
  console.log(`Último pago: ${final!.fecha_ultimo_pago}`);
  console.log(`Última causación: ${final!.ultima_causacion}`);
  console.log(`Días mora: ${final!.dias_mora_actual}`);
  console.log(`En mora: ${final!.en_mora}`);
}

main().catch(console.error);
