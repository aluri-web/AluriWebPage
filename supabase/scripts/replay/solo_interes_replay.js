/**
 * Solo-Interes Anticipada Replay — rebuild saldos and causaciones.
 *
 * Matches Excel convention: monthly interest = saldo × tasa_nominal,
 * distributed linearly across period days (daily rate = r / days_in_period).
 *
 * USAGE (env vars):
 *   PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE — PG connection
 *   CODIGO                         — credit code (e.g. "CR018")
 *   P                              — monto_solicitado (capital inicial)
 *   R                              — tasa_nominal as decimal (e.g. 0.019 for 1.9%)
 *   DESEMBOLSO                     — ISO date of disbursement
 *   TODAY                          — ISO date (default: today)
 *   PAGOS                          — JSON array of {fecha,total,cap,ref}
 *
 * CASCADA (solo_interes anticipada):
 *   cap_hint absorbs first, then mora, then remainder to interest.
 *   saldo_intereses can go negative (prepayment of future periods).
 *
 * Deletes existing causaciones_diarias, causaciones_inversionistas, and pago
 * transacciones for the credit before rebuilding. Runs in a single transaction.
 */

const { Client } = require("pg");

const CODIGO = process.env.CODIGO;
const pagos = JSON.parse(process.env.PAGOS || "[]");
const P = parseInt(process.env.P);
const r = parseFloat(process.env.R);
const desembolso = new Date(process.env.DESEMBOLSO);
const today = new Date(process.env.TODAY || new Date().toISOString());

const client = new Client({
  host: process.env.PGHOST || "aws-1-eu-west-2.pooler.supabase.com",
  port: parseInt(process.env.PGPORT || "5432"),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE || "postgres",
  ssl: { rejectUnauthorized: false }
});

function daysBetween(a, b) { return Math.round((b.getTime() - a.getTime()) / 86400000); }
function addMonths(d, m) { const x = new Date(d); x.setUTCMonth(x.getUTCMonth() + m); return x; }

async function getUsura(fechaStr) {
  const res = await client.query(
    "SELECT tasa_ea FROM tasas_oficiales WHERE tipo = $1 AND vigencia_desde <= $2 AND vigencia_hasta >= $2 ORDER BY vigencia_desde DESC LIMIT 1",
    ["usura_consumo", fechaStr]
  );
  return res.rows[0] ? parseFloat(res.rows[0].tasa_ea) : 26.76;
}

async function run() {
  if (!CODIGO) throw new Error("CODIGO env var is required");
  if (!P || !r || !desembolso) throw new Error("P, R, DESEMBOLSO env vars required");
  await client.connect();
  await client.query("SET ROLE postgres");
  await client.query("SET TIME ZONE 'UTC'");

  const cr = await client.query("SELECT id FROM creditos WHERE codigo_credito = $1", [CODIGO]);
  if (cr.rows.length === 0) throw new Error("Credit not found: " + CODIGO);
  const creditoId = cr.rows[0].id;

  const inv = await client.query("SELECT id, inversionista_id, monto_invertido FROM inversiones WHERE credito_id = $1 AND estado = 'activo'", [creditoId]);
  const totalInv = inv.rows.reduce((s, i) => s + parseFloat(i.monto_invertido), 0);
  const parts = inv.rows.map(i => ({
    inversion_id: i.id,
    inversionista_id: i.inversionista_id,
    pct: totalInv > 0 ? parseFloat(i.monto_invertido) / totalInv * 100 : 0
  }));

  await client.query("BEGIN");
  try {
    await client.query("DELETE FROM causaciones_inversionistas WHERE credito_id = $1", [creditoId]);
    await client.query("DELETE FROM causaciones_diarias WHERE credito_id = $1", [creditoId]);
    await client.query("DELETE FROM transacciones WHERE credito_id = $1 AND tipo_transaccion IN ('causacion_interes','causacion_mora','pago_mora','pago_interes','pago_capital')", [creditoId]);

    let saldoCap = P, saldoCapEsp = P, saldoInt = 0, saldoMora = 0;
    let fechaUltPago = null;
    let interesAcumuladoTotal = 0;

    async function aplicarPago(pago, dateStr) {
      const capHint = pago.cap || 0;
      let restante = pago.total;
      const mCap = Math.min(capHint, restante);
      restante -= mCap;
      saldoCap -= mCap;

      const mMora = Math.min(restante, saldoMora);
      saldoMora -= mMora;
      restante -= mMora;

      const mInt = restante;
      saldoInt -= mInt;

      if (mCap > 0) await client.query("INSERT INTO transacciones (credito_id,tipo_transaccion,monto,fecha_aplicacion,fecha_transaccion,referencia_pago,usuario_registro,concepto) VALUES ($1,'pago_capital',$2,$3,NOW(),$4,'REPLAY','')", [creditoId, mCap, dateStr, pago.ref]);
      if (mMora > 0) await client.query("INSERT INTO transacciones (credito_id,tipo_transaccion,monto,fecha_aplicacion,fecha_transaccion,referencia_pago,usuario_registro,concepto) VALUES ($1,'pago_mora',$2,$3,NOW(),$4,'REPLAY','')", [creditoId, mMora, dateStr, pago.ref]);
      if (mInt > 0) await client.query("INSERT INTO transacciones (credito_id,tipo_transaccion,monto,fecha_aplicacion,fecha_transaccion,referencia_pago,usuario_registro,concepto) VALUES ($1,'pago_interes',$2,$3,NOW(),$4,'REPLAY','')", [creditoId, mInt, dateStr, pago.ref]);
      console.log(`Pago ${dateStr}: cap=$${mCap.toLocaleString()} mora=$${mMora.toLocaleString()} int=$${mInt.toLocaleString()} | saldo cap=$${saldoCap.toLocaleString()} int=$${saldoInt.toLocaleString()} mora=$${saldoMora.toLocaleString()}`);
    }

    // Apply anticipated pago (on or before desembolso)
    const antiPago = pagos.find(p => new Date(p.fecha + "T00:00:00Z") <= desembolso);
    if (antiPago) {
      await aplicarPago(antiPago, antiPago.fecha);
      fechaUltPago = new Date(antiPago.fecha + "T00:00:00Z");
    }

    const currentDate = new Date(desembolso);
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    let pagoIdx = antiPago ? 1 : 0;

    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().substring(0, 10);
      const nextExpectedPay = fechaUltPago ? addMonths(fechaUltPago, 1) : addMonths(desembolso, 1);

      let periodoStart, periodoEnd;
      if (currentDate <= nextExpectedPay) {
        periodoStart = fechaUltPago || desembolso;
        periodoEnd = nextExpectedPay;
      } else {
        periodoStart = nextExpectedPay;
        periodoEnd = addMonths(nextExpectedPay, 1);
      }
      const diasPeriodo = daysBetween(periodoStart, periodoEnd);

      let enMora = false, diasMora = 0;
      if (currentDate > nextExpectedPay) {
        enMora = true;
        diasMora = daysBetween(nextExpectedPay, currentDate);
      }

      const dailyRate = r / diasPeriodo;
      const intDia = Math.round(saldoCap * dailyRate);
      saldoInt += intDia;
      interesAcumuladoTotal += intDia;

      const usuraEA = await getUsura(dateStr);
      const tasaMoraDiaria = Math.pow(1 + usuraEA / 100, 1/365) - 1;
      let moraDia = 0;
      if (enMora && saldoCap > 0) {
        moraDia = Math.round(saldoCap * tasaMoraDiaria);
        saldoMora += moraDia;
      }
      const intMoraPot = Math.round(saldoCap * tasaMoraDiaria);

      const causRes = await client.query(
        "INSERT INTO causaciones_diarias (credito_id,fecha_causacion,saldo_base,capital_esperado,capital_real,tasa_nominal,tasa_diaria,tasa_mora_diaria,interes_causado,mora_causada,interes_moratorio_potencial,dias_mora,en_mora,monto_para_colocarse) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id",
        [creditoId, dateStr, saldoCap, saldoCapEsp, saldoCap, r*100, dailyRate, tasaMoraDiaria, intDia, moraDia, intMoraPot, diasMora, enMora, saldoCap - saldoCapEsp]
      );
      const causacionId = causRes.rows[0].id;
      for (const p of parts) {
        const invAtrib = Math.round(intDia * p.pct / 100);
        const moraAtrib = Math.round(moraDia * p.pct / 100);
        await client.query(
          "INSERT INTO causaciones_inversionistas (causacion_id,inversion_id,inversionista_id,credito_id,fecha_causacion,porcentaje_participacion,interes_atribuido,mora_atribuida) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
          [causacionId, p.inversion_id, p.inversionista_id, creditoId, dateStr, p.pct, invAtrib, moraAtrib]
        );
      }

      if (pagoIdx < pagos.length && pagos[pagoIdx].fecha === dateStr) {
        await aplicarPago(pagos[pagoIdx], dateStr);
        fechaUltPago = new Date(dateStr + "T00:00:00Z");
        pagoIdx++;
      }
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    const nextExpectedPayFinal = fechaUltPago ? addMonths(fechaUltPago, 1) : addMonths(desembolso, 1);
    const enMoraFinal = today > nextExpectedPayFinal && saldoCap > 0;
    const diasMoraFinal = enMoraFinal ? daysBetween(nextExpectedPayFinal, today) : 0;

    await client.query(
      "UPDATE creditos SET saldo_capital=$1,saldo_capital_esperado=$2,saldo_intereses=$3,saldo_mora=$4,ultima_causacion=$5,fecha_ultimo_pago=$6,dias_mora_actual=$7,en_mora=$8,interes_acumulado_total=$9,saldo_capital_anterior=$10 WHERE id=$11",
      [saldoCap, Math.round(saldoCapEsp), saldoInt, saldoMora, today.toISOString().substring(0,10), (fechaUltPago || desembolso).toISOString().substring(0,10), diasMoraFinal, enMoraFinal, interesAcumuladoTotal, saldoCap, creditoId]
    );
    await client.query("COMMIT");
    console.log(`=== COMMITTED === ${CODIGO} cap=$${saldoCap.toLocaleString()} int=$${saldoInt.toLocaleString()} mora=$${saldoMora.toLocaleString()} dias=${diasMoraFinal} enMora=${enMoraFinal}`);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  }
  await client.end();
}

run().catch(e => { console.error("ERR:", e.message); process.exit(1); });
