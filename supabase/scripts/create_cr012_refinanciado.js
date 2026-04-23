/**
 * Crea CR012 como credito historico refinanciado por CR022.
 *
 * CR012: Jorge Humberto Alzate. $40M, 60 meses, 1.8% NM, hipoteca.
 *   Fecha desembolso: 2025-12-03. Inversionista: Sergio A. Velandia 100%.
 *   2 abonos pagados (2025-12-03, 2026-01-03), luego refinanciado el
 *   2026-01-20 con CR022 ($67M), que cubrio el saldo pendiente y entrego
 *   la diferencia al tomador.
 *
 * Migracion: agrega columna creditos.credito_refinanciado_por_id.
 */
const { Client } = require("pg");
const crypto = require("crypto");

const CR022_ID = "adeff989-d497-4751-9d38-8da9a393e89a";
const CLIENTE_ID = "e04b8d87-8d05-4449-bb44-9ad579a7654d"; // Jorge Humberto Alzate
const SERGIO_ID = "2316ffea-8185-4098-bb95-c786b92331d7"; // Sergio A. Velandia

async function main() {
  const c = new Client({ ssl: { rejectUnauthorized: false } });
  await c.connect();
  await c.query("BEGIN");
  try {
    // 1. Migration: add column (idempotent)
    await c.query(`
      ALTER TABLE public.creditos
        ADD COLUMN IF NOT EXISTS credito_refinanciado_por_id uuid
        REFERENCES public.creditos(id) ON DELETE SET NULL
    `);
    await c.query(`
      COMMENT ON COLUMN public.creditos.credito_refinanciado_por_id IS
        'Apunta al credito que refinancio (liquido) a este credito. Usado cuando un borrower pide aumento de cupo: se cierra el credito original y se abre uno nuevo con monto mayor, marcando la relacion aqui.'
    `);

    // 2. Insert CR012 if missing
    const existing = await c.query("SELECT id FROM creditos WHERE codigo_credito='CR012'");
    let cr012Id;
    if (existing.rowCount > 0) {
      cr012Id = existing.rows[0].id;
      console.log("CR012 ya existe:", cr012Id);
    } else {
      cr012Id = crypto.randomUUID();
      await c.query(
        `INSERT INTO creditos (
          id, cliente_id, codigo_credito, monto_solicitado, valor_colocado,
          tasa_nominal, tasa_interes_ea, tasa_mora, plazo,
          fecha_desembolso, fecha_firma,
          producto, estado, estado_credito,
          saldo_capital, saldo_intereses, saldo_mora,
          saldo_capital_esperado, saldo_capital_anterior,
          tipo_contrato, tipo_amortizacion, tipo_liquidacion, tipo_persona,
          valor_comercial, comision_deudor, ltv, pagador,
          en_mora, dias_mora_actual, interes_acumulado_total,
          direccion_inmueble, ciudad_inmueble, tipo_inmueble,
          credito_refinanciado_por_id,
          created_at, updated_at
        ) VALUES (
          $1, $2, 'CR012', 40000000, 38211904,
          1.8, 23.87, 2.07, 60,
          '2025-12-03T00:00:00Z', '2025-11-07T00:00:00Z',
          'consumo', 'refinanciado', 'refinanciado',
          0, 0, 0,
          0, 0,
          'hipotecario', 'francesa', 'anticipada', 'natural',
          200000000, 1788096, 20, 'aluri',
          false, 0, 1820597,
          'Calle 19sur # 69 - 55 int 10 apto 101', 'Bogotá', 'apartamento',
          $3,
          NOW(), NOW()
        )`,
        [cr012Id, CLIENTE_ID, CR022_ID],
      );
      console.log("CR012 insertado:", cr012Id);
    }

    // 3. Insert inversion (Sergio 100%) if missing
    const invExisting = await c.query(
      "SELECT id FROM inversiones WHERE credito_id=$1 AND inversionista_id=$2",
      [cr012Id, SERGIO_ID],
    );
    if (invExisting.rowCount === 0) {
      await c.query(
        `INSERT INTO inversiones (
          id, credito_id, inversionista_id, monto_invertido, porcentaje_participacion,
          fecha_inversion, estado, interes_acumulado, mora_acumulada,
          created_at, updated_at, confirmed_at
        ) VALUES (
          gen_random_uuid(), $1, $2, 40000000, 100.0,
          '2025-12-03T00:00:00Z', 'liquidada', 1820597, 0,
          NOW(), NOW(), '2025-12-03T00:00:00Z'
        )`,
        [cr012Id, SERGIO_ID],
      );
      console.log("Inversion de Sergio insertada");
    } else {
      console.log("Inversion ya existe");
    }

    // 4. Insert pago transacciones (skip if already exist via referencia_pago)
    const pagos = [
      // Abono periodo 0 (2025-12-03): $1,095,700 total = $720,000 int + $375,700 cap
      {
        fecha: "2025-12-03",
        tipo: "pago_interes",
        monto: 720000,
        ref: "CR012-MIG-2025-12-03-INT",
      },
      {
        fecha: "2025-12-03",
        tipo: "pago_capital",
        monto: 375700,
        ref: "CR012-MIG-2025-12-03-CAP",
      },
      // Abono periodo 1 (2026-01-03): $1,095,700 total = $713,237 int + $382,463 cap
      {
        fecha: "2026-01-03",
        tipo: "pago_interes",
        monto: 713237,
        ref: "CR012-MIG-2026-01-03-INT",
      },
      {
        fecha: "2026-01-03",
        tipo: "pago_capital",
        monto: 382463,
        ref: "CR012-MIG-2026-01-03-CAP",
      },
      // Cancelacion al refinanciar (2026-01-20): 17 dias de interes + capital restante
      // Saldo cap despues de abono 2 = 40,000,000 - 375,700 - 382,463 = 39,241,837
      // Interes: 17 dias × (1.8%/31) × 39,241,837 ~ 387,359
      {
        fecha: "2026-01-20",
        tipo: "pago_interes",
        monto: 387360,
        ref: "CR012-MIG-2026-01-20-CANCEL-INT",
      },
      {
        fecha: "2026-01-20",
        tipo: "pago_capital",
        monto: 39241837,
        ref: "CR012-MIG-2026-01-20-CANCEL-CAP",
      },
    ];

    for (const p of pagos) {
      const ex = await c.query("SELECT id FROM transacciones WHERE referencia_pago=$1", [p.ref]);
      if (ex.rowCount > 0) {
        console.log("  skip (exists):", p.ref);
        continue;
      }
      await c.query(
        `INSERT INTO transacciones (
          credito_id, tipo_transaccion, concepto, monto,
          fecha_transaccion, fecha_aplicacion, referencia_pago, usuario_registro, created_at
        ) VALUES ($1, $2, $3, $4, NOW(), $5::date, $6, 'migracion-cr012', NOW())`,
        [
          cr012Id,
          p.tipo,
          `CR012 ${p.tipo.replace("pago_", "")} (historico refinanciado)`,
          p.monto,
          p.fecha,
          p.ref,
        ],
      );
      console.log("  inserted:", p.ref, "$", p.monto.toLocaleString());
    }

    await c.query("COMMIT");
    console.log("\nCOMMIT OK. CR012 creado y vinculado a CR022.");

    // Verify
    const v = await c.query(
      `SELECT c.codigo_credito, c.estado_credito, c.saldo_capital, c.saldo_intereses, c.saldo_mora,
              cp.codigo_credito AS refinanciado_por
       FROM creditos c
       LEFT JOIN creditos cp ON cp.id = c.credito_refinanciado_por_id
       WHERE c.codigo_credito = 'CR012'`,
    );
    console.log("\nCR012:", JSON.stringify(v.rows[0], null, 2));
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  }
  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
