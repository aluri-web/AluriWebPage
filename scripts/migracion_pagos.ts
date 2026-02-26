import fs from 'fs';
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

const CSV_FILE_PATH = 'docs/pagos 2026-02-26.csv';

// ==========================================
// HELPERS DE PARSEO
// ==========================================

// "$4,935,162" → 4935162
function parseMoney(value: string): number {
  if (!value) return 0;
  return parseFloat(value.replace(/[$\s,]/g, '')) || 0;
}

// "4/3/2025" (DD/MM/YYYY) → "2025-03-04"
function parseDateToISO(value: string): string | null {
  if (!value || value.trim() === '') return null;
  const parts = value.trim().split('/');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

// "4/3/2025" → Date object for sorting
function parseDateToDate(value: string): Date {
  const parts = value.trim().split('/');
  const [day, month, year] = parts;
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

function normalizeCode(code: string): string {
  return code.trim();
}

// ==========================================
// INTERFACES
// ==========================================

interface PagoCSV {
  codigoCredito: string;
  deudor: string;
  fecha: string;
  fechaISO: string;
  fechaDate: Date;
  monto: number;
  concepto: string;
}

interface CreditoDB {
  id: string;
  codigo_credito: string;
  tasa_nominal: number;
  valor_colocado: number;
  monto_solicitado: number;
  tipo_amortizacion: string | null;
  tipo_liquidacion: string | null;
  fecha_desembolso: string | null;
  estado_credito: string | null;
  tasa_mora: number | null;
}

// Compute how many full months of interest are due from base date to a given date
function monthsOfInterestDue(base: Date, date: Date, anticipada: boolean): number {
  const yearDiff = date.getFullYear() - base.getFullYear();
  const monthDiff = date.getMonth() - base.getMonth();
  let periods = yearDiff * 12 + monthDiff;
  if (date.getDate() >= base.getDate()) periods++;
  if (!anticipada) periods--;
  return Math.max(0, periods);
}

// ==========================================
// LOGICA DE MIGRACION
// ==========================================

async function migrate() {
  console.log('=== MIGRACION DE PAGOS (v2) ===\n');

  // PASO 0: Limpiar transacciones de migración anterior
  console.log('Limpiando transacciones de migración anterior (MIG-*)...');
  const { error: deleteError, count } = await supabase
    .from('transacciones')
    .delete({ count: 'exact' })
    .like('referencia_pago', 'MIG-%');

  if (deleteError) {
    console.error('Error limpiando:', deleteError.message);
  } else {
    console.log(`   Eliminadas: ${count || 0} transacciones anteriores.\n`);
  }

  console.log('Leyendo CSV de pagos...');

  // Read CSV manually (no header row)
  const csvContent = fs.readFileSync(path.resolve(CSV_FILE_PATH), 'latin1');
  const csvLines = csvContent.split('\n').filter(l => l.trim().length > 0);

  console.log(`Se encontraron ${csvLines.length} filas.\n`);

  {
      // 1. Parsear todas las filas del CSV (formato: codigo;deudor;fecha;valor;concepto)
      const pagos: PagoCSV[] = [];
      for (const line of csvLines) {
        const cols = line.split(';');
        const codigoCredito = normalizeCode(cols[0] || '');
        const fechaRaw = (cols[2] || '').trim();
        const fechaISO = parseDateToISO(fechaRaw);

        if (!codigoCredito || !codigoCredito.startsWith('CR') || !fechaISO) continue;

        pagos.push({
          codigoCredito,
          deudor: (cols[1] || '').trim(),
          fecha: fechaRaw,
          fechaISO,
          fechaDate: parseDateToDate(fechaRaw),
          monto: parseMoney(cols[3] || '0'),
          concepto: (cols[4] || '').trim(),
        });
      }

      console.log(`Pagos parseados: ${pagos.length}`);

      // 2. Agrupar pagos por codigo credito
      const pagosPorCredito = new Map<string, PagoCSV[]>();
      for (const pago of pagos) {
        const existing = pagosPorCredito.get(pago.codigoCredito) || [];
        existing.push(pago);
        pagosPorCredito.set(pago.codigoCredito, existing);
      }

      for (const [, creditoPagos] of pagosPorCredito) {
        creditoPagos.sort((a, b) => a.fechaDate.getTime() - b.fechaDate.getTime());
      }

      console.log(`Creditos con pagos: ${pagosPorCredito.size}\n`);

      let transaccionesCreadas = 0;
      let transaccionesFallidas = 0;
      let creditosNoEncontrados = 0;

      // 3. Procesar cada credito
      for (const [codigoCredito, creditoPagos] of pagosPorCredito) {
        console.log(`\n--- ${codigoCredito} (${creditoPagos.length} pagos) ---`);

        // Buscar credito en DB con tipo_amortizacion
        const { data: credito, error: creditoError } = await supabase
          .from('creditos')
          .select('id, codigo_credito, tasa_nominal, valor_colocado, monto_solicitado, tipo_amortizacion, tipo_liquidacion, fecha_desembolso, estado_credito, tasa_mora')
          .eq('codigo_credito', codigoCredito)
          .single();

        if (creditoError || !credito) {
          console.log(`   Credito ${codigoCredito} no encontrado en DB. Saltando.`);
          creditosNoEncontrados++;
          continue;
        }

        const creditoDB = credito as CreditoDB;
        const tasaMensual = creditoDB.tasa_nominal / 100;
        const principal = creditoDB.valor_colocado || creditoDB.monto_solicitado;
        const esSoloInteres = (creditoDB.tipo_amortizacion || '').toLowerCase().includes('solo_interes');
        const esAnticipada = (creditoDB.tipo_liquidacion || '').toLowerCase().includes('anticip');

        const interesMensualEsperado = Math.round(principal * tasaMensual);
        console.log(`   Tipo: ${esSoloInteres ? 'SOLO INTERES' : 'FRANCESA'} | Liquidación: ${esAnticipada ? 'ANTICIPADA' : 'VENCIDA'} | Tasa mensual: ${creditoDB.tasa_nominal}% | Principal: $${principal.toLocaleString()} | Interes mensual: $${interesMensualEsperado.toLocaleString()}`);

        // Para francesa, trackear saldo decreciente
        let saldoCapital = principal;

        // Tracking de saldo de intereses (intereses adeudados acumulados)
        let saldoIntereses = 0;
        let mesesAcumulados = 0;

        // Fecha base para contar meses de interés
        const fechaBase = creditoDB.fecha_desembolso
          ? new Date(creditoDB.fecha_desembolso)
          : creditoPagos[0].fechaDate;

        // 4. Procesar cada pago
        let lastPaymentDate: Date | null = null;

        for (const pago of creditoPagos) {
          // --- Acumular intereses mensuales debidos hasta la fecha de este pago ---
          const mesesDebidos = monthsOfInterestDue(fechaBase, pago.fechaDate, esAnticipada);
          for (let m = mesesAcumulados; m < mesesDebidos; m++) {
            if (esSoloInteres) {
              saldoIntereses += interesMensualEsperado;
            } else {
              saldoIntereses += Math.round(saldoCapital * tasaMensual);
            }
          }
          mesesAcumulados = Math.max(mesesAcumulados, mesesDebidos);

          const refPago = `MIG-${codigoCredito}-${pago.fechaISO}-${pago.monto}`;
          const metodo = pago.concepto.toLowerCase().includes('descuento')
            ? 'descuento_giro'
            : 'consignacion';

          let porcionIntereses = 0;
          let porcionCapital = 0;

          // --- Condonación de Mora: se cuenta como pago de intereses ---
          if (pago.concepto.toLowerCase().includes('condonaci')) {
            porcionIntereses = pago.monto;
            porcionCapital = 0;
          }
          // --- Solo Intereses: pagos regulares = 100% interés, balloon = 100% capital ---
          else if (esSoloInteres) {
            if (pago.monto >= principal * 0.5) {
              // Pago balloon: devolución total del capital
              porcionCapital = Math.min(pago.monto, principal);
              porcionIntereses = Math.max(0, pago.monto - principal);
              console.log(`   BALLOON: $${pago.monto.toLocaleString()} → Capital: $${porcionCapital.toLocaleString()}, Intereses: $${porcionIntereses.toLocaleString()}`);
            } else {
              // Pago regular: 100% intereses
              porcionIntereses = pago.monto;
              porcionCapital = 0;
            }
          }
          // --- Francesa: split proporcional con saldo decreciente ---
          else {
            const interesesMes = Math.round(saldoCapital * tasaMensual);
            porcionIntereses = Math.min(pago.monto, interesesMes);
            porcionCapital = Math.max(0, pago.monto - porcionIntereses);
          }

          const transacciones: any[] = [];

          if (porcionIntereses > 0) {
            transacciones.push({
              credito_id: creditoDB.id,
              tipo_transaccion: 'pago_interes',
              concepto: `Pago intereses - ${pago.concepto}`,
              monto: porcionIntereses,
              fecha_transaccion: new Date(pago.fechaISO).toISOString(),
              fecha_aplicacion: pago.fechaISO,
              referencia_pago: refPago,
              metodo_pago: metodo,
            });
          }

          if (porcionCapital > 0) {
            transacciones.push({
              credito_id: creditoDB.id,
              tipo_transaccion: 'pago_capital',
              concepto: `Abono a capital - ${pago.concepto}`,
              monto: porcionCapital,
              fecha_transaccion: new Date(pago.fechaISO).toISOString(),
              fecha_aplicacion: pago.fechaISO,
              referencia_pago: refPago,
              metodo_pago: metodo,
            });
          }

          if (transacciones.length > 0) {
            const { error } = await supabase
              .from('transacciones')
              .insert(transacciones);

            if (error) {
              console.error(`   ERROR ${pago.fecha}: ${error.message}`);
              transaccionesFallidas++;
            } else {
              console.log(`   ${pago.fecha} $${pago.monto.toLocaleString()} → Int: $${porcionIntereses.toLocaleString()} + Cap: $${porcionCapital.toLocaleString()} ✓`);
              transaccionesCreadas += transacciones.length;
            }
          }

          // Reducir saldo de intereses (clamped a 0: sin crédito por sobrepago)
          saldoIntereses = Math.max(0, saldoIntereses - porcionIntereses);

          // Actualizar saldo capital
          saldoCapital = Math.max(0, saldoCapital - porcionCapital);

          lastPaymentDate = pago.fechaDate;
        }

        // Para créditos pagados: saldo liquidado completamente
        if (creditoDB.estado_credito === 'pagado') {
          saldoIntereses = 0;
          saldoCapital = 0;
        }
        // Para créditos activos: acumular intereses hasta hoy
        else {
          const hoy = new Date();
          const mesesHoy = monthsOfInterestDue(fechaBase, hoy, esAnticipada);
          for (let m = mesesAcumulados; m < mesesHoy; m++) {
            if (esSoloInteres) {
              saldoIntereses += interesMensualEsperado;
            } else {
              saldoIntereses += Math.round(saldoCapital * tasaMensual);
            }
          }
          mesesAcumulados = Math.max(mesesAcumulados, mesesHoy);

          // Interés parcial: días desde el último corte mensual hasta hoy
          // Calcular fecha del último corte mensual
          const offsetAnticipada = esAnticipada ? 1 : 0;
          const lastBoundary = new Date(fechaBase);
          lastBoundary.setMonth(lastBoundary.getMonth() + mesesAcumulados - offsetAnticipada);
          const diasParciales = Math.max(0, Math.round(
            (hoy.getTime() - lastBoundary.getTime()) / (24 * 60 * 60 * 1000)
          ));
          if (diasParciales > 0 && diasParciales < 30) {
            const partialInterest = esSoloInteres
              ? Math.round(interesMensualEsperado * diasParciales / 30)
              : Math.round(saldoCapital * tasaMensual * diasParciales / 30);
            saldoIntereses += partialInterest;
          }
        }

        // 6. Calcular mora: si no se pagó antes de la fecha de vencimiento del período actual
        let enMora = false;
        let saldoMora = 0;

        if (creditoDB.estado_credito !== 'pagado' && lastPaymentDate && saldoCapital > 0) {
          const hoy = new Date();
          const diaPago = fechaBase.getDate();

          // Calcular la próxima fecha de vencimiento después del último pago
          const proximoVencimiento = new Date(lastPaymentDate);
          proximoVencimiento.setMonth(proximoVencimiento.getMonth() + 1);
          proximoVencimiento.setDate(diaPago);

          if (hoy > proximoVencimiento) {
            enMora = true;
            const diasMora = Math.max(0, Math.round(
              (hoy.getTime() - proximoVencimiento.getTime()) / (24 * 60 * 60 * 1000)
            ));
            const tasaMoraMensual = (creditoDB.tasa_mora || 2.07) / 100;
            saldoMora = Math.round(saldoCapital * tasaMoraMensual / 30 * diasMora);
            console.log(`   EN MORA: ${diasMora} días desde ${proximoVencimiento.toISOString().split('T')[0]} | Saldo mora: $${saldoMora.toLocaleString()}`);
          }
        }

        console.log(`   Saldo capital final: $${saldoCapital.toLocaleString()}`);
        console.log(`   Saldo intereses final: $${saldoIntereses.toLocaleString()}`);
        console.log(`   En mora: ${enMora} | Saldo mora: $${saldoMora.toLocaleString()}`);

        // 7. Actualizar saldos en la tabla creditos
        const { error: updateError } = await supabase
          .from('creditos')
          .update({
            saldo_capital: saldoCapital,
            saldo_intereses: saldoIntereses,
            saldo_mora: saldoMora,
            en_mora: enMora,
            fecha_ultimo_pago: lastPaymentDate ? lastPaymentDate.toISOString().split('T')[0] : null,
          })
          .eq('id', creditoDB.id);

        if (updateError) {
          console.error(`   ERROR actualizando saldos: ${updateError.message}`);
        } else {
          console.log(`   Saldos actualizados en DB ✓`);
        }
      }

      console.log(`\n=============================`);
      console.log(`Migracion de Pagos v2 Finalizada.`);
      console.log(`Transacciones creadas: ${transaccionesCreadas}`);
      console.log(`Transacciones fallidas: ${transaccionesFallidas}`);
      console.log(`Creditos no encontrados: ${creditosNoEncontrados}`);
      console.log(`=============================`);
  }
}

migrate();
