/**
 * Compara los ABONOS del CSV vs las transacciones registradas en la DB
 * para cada credito. Reporta pagos faltantes en DB o amounts discordantes.
 *
 * Uso:
 *   PGPASSWORD=xxx node supabase/scripts/compare_abonos_csv.js
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const CSV_DIR = "C:\\Users\\pcaic\\Documents\\Aluri\\Creditos CSV";
const TOL = 1; // tolerance in COP for amount comparison

// Parse d/m/yyyy -> YYYY-MM-DD
function parseDate(s) {
  if (!s) return null;
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

// Parse "$4,935,200" / "-$38" / "$0" -> number
function parseAmount(s) {
  if (!s) return 0;
  const cleaned = s.replace(/[$",\s]/g, "");
  const n = Number(cleaned);
  return isNaN(n) ? 0 : n;
}

// Simple CSV split honoring quoted strings
function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQ = !inQ;
    } else if (c === "," && !inQ) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function extractAbonosFromCsv(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);
  // Find the header row with "ABONOS" section. Columns are:
  // index 9 = FECHA DE PAGO (abono), index 10 = ABONO
  const abonos = [];
  let started = false;
  for (const line of lines) {
    if (!line.trim()) continue;
    if (/AMORTIZACI[ÓO]N INICIAL/i.test(line)) {
      started = true;
      continue;
    }
    if (!started) continue;
    // skip the header row under AMORTIZACION INICIAL
    if (/^Periodos,/i.test(line)) continue;
    const cols = splitCsvLine(line);
    if (cols.length < 11) continue;
    const fechaStr = (cols[9] || "").trim();
    const abonoStr = (cols[10] || "").trim();
    if (!fechaStr || !abonoStr) continue;
    const fecha = parseDate(fechaStr);
    const amount = parseAmount(abonoStr);
    if (!fecha || amount <= 0) continue;
    abonos.push({ fecha, amount });
  }
  return abonos;
}

async function main() {
  const c = new Client({ ssl: { rejectUnauthorized: false } });
  await c.connect();

  const files = fs
    .readdirSync(CSV_DIR)
    .filter((f) => /Operaciones Aluri - CR\d+\.csv$/.test(f))
    .sort();

  const globalReport = [];

  for (const file of files) {
    const codigo = file.match(/CR\d+/)[0];
    const abonos = extractAbonosFromCsv(path.join(CSV_DIR, file));

    // Fetch credit ID
    const credRes = await c.query(
      "SELECT id, saldo_capital, estado_credito FROM creditos WHERE codigo_credito = $1",
      [codigo],
    );
    if (credRes.rowCount === 0) {
      globalReport.push({ codigo, status: "MISSING_CREDIT", csvAbonos: abonos.length });
      continue;
    }
    const credId = credRes.rows[0].id;

    // Fetch all pago transacciones from DB, grouped by fecha
    const txRes = await c.query(
      `SELECT fecha_aplicacion::text AS fecha, SUM(monto)::numeric AS total
       FROM transacciones
       WHERE credito_id = $1
         AND tipo_transaccion IN ('pago_capital','pago_interes','pago_mora','pago')
       GROUP BY fecha_aplicacion::text
       ORDER BY fecha_aplicacion::text`,
      [credId],
    );
    const dbByDate = new Map();
    for (const r of txRes.rows) {
      dbByDate.set(r.fecha, Number(r.total));
    }

    const csvByDate = new Map();
    for (const a of abonos) {
      csvByDate.set(a.fecha, (csvByDate.get(a.fecha) || 0) + a.amount);
    }

    const allDates = new Set([...csvByDate.keys(), ...dbByDate.keys()]);
    const sortedDates = [...allDates].sort();
    const rows = [];
    let mismatches = 0;
    let missing = 0;
    let extra = 0;
    for (const d of sortedDates) {
      const csv = csvByDate.get(d) || 0;
      const db = dbByDate.get(d) || 0;
      const diff = Math.round(db - csv);
      let status = "OK";
      if (csv > 0 && db === 0) {
        status = "MISSING_IN_DB";
        missing++;
      } else if (csv === 0 && db > 0) {
        status = "EXTRA_IN_DB";
        extra++;
      } else if (Math.abs(diff) > TOL) {
        status = "AMOUNT_DIFF";
        mismatches++;
      }
      if (status !== "OK") {
        rows.push({ fecha: d, csv, db, diff, status });
      }
    }
    globalReport.push({
      codigo,
      csvCount: csvByDate.size,
      dbCount: dbByDate.size,
      missing,
      extra,
      mismatches,
      detail: rows,
    });
  }

  await c.end();

  // Print
  console.log("\n=== RESUMEN ===\n");
  for (const r of globalReport) {
    if (r.status === "MISSING_CREDIT") {
      console.log(`${r.codigo}: [!] Credito no existe en DB (CSV tiene ${r.csvAbonos} abonos)`);
      continue;
    }
    const total = r.missing + r.extra + r.mismatches;
    const label = total === 0 ? "[OK]" : "[DIFF]";
    console.log(
      `${label} ${r.codigo}  CSV=${r.csvCount} abonos  DB=${r.dbCount} fechas  missing=${r.missing} extra=${r.extra} amount_diff=${r.mismatches}`,
    );
    for (const row of r.detail) {
      console.log(
        `   ${row.status.padEnd(14)} ${row.fecha}  csv=${row.csv.toLocaleString()}  db=${row.db.toLocaleString()}  diff=${row.diff.toLocaleString()}`,
      );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
