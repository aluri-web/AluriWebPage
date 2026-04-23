/**
 * Verifica que el CSV y el registro en DB sean el mismo credito.
 * Si cliente, monto o fecha de desembolso no coinciden, el codigo fue
 * reciclado y el CSV es historico (no se aplican sus abonos).
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const CSV_DIR = "C:\\Users\\pcaic\\Documents\\Aluri\\Creditos CSV";

function splitCsvLine(line) {
  const out = [];
  let cur = "",
    inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQ = !inQ;
    else if (ch === "," && !inQ) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

function parseDate(s) {
  if (!s) return null;
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

function parseAmount(s) {
  if (!s) return 0;
  const n = Number(s.replace(/[$",\s]/g, ""));
  return isNaN(n) ? 0 : n;
}

function extractCsvHeader(file) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  let tomador = null,
    monto = null,
    fechaDesembolso = null,
    plazo = null,
    tasaNM = null;
  for (let i = 0; i < 20; i++) {
    const l = lines[i] || "";
    const cols = splitCsvLine(l);
    if (/^Tomador:?/i.test(cols[0])) tomador = cols[1]?.trim();
    if (/^Monto/i.test(cols[0]) && /CONDICIONES/.test(cols[0]) === false && !monto)
      monto = parseAmount(cols[1]);
    if (/^Plazo/i.test(cols[0])) plazo = Number(cols[1]);
    if (/^Tasa NM/i.test(cols[0])) tasaNM = parseAmount(cols[1].replace("%", ""));
    // DESEMBOLSOS block: FECHA in col[4]=label, col[5]=value
    if (cols[4] && /^FECHA$/.test(cols[4].trim())) {
      const d = parseDate((cols[5] || "").trim());
      if (d) fechaDesembolso = d;
    }
  }
  return { tomador, monto, fechaDesembolso, plazo, tasaNM };
}

async function main() {
  const c = new Client({ ssl: { rejectUnauthorized: false } });
  await c.connect();

  const files = fs
    .readdirSync(CSV_DIR)
    .filter((f) => /Operaciones Aluri - CR\d+\.csv$/.test(f))
    .sort();

  console.log(
    "codigo | csv_tomador | db_tomador | csv_monto | db_monto | csv_desembolso | db_desembolso | match?",
  );
  console.log("-".repeat(120));

  for (const f of files) {
    const codigo = f.match(/CR\d+/)[0];
    const header = extractCsvHeader(path.join(CSV_DIR, f));
    const r = await c.query(
      `SELECT c.codigo_credito, c.monto_solicitado, c.fecha_desembolso::date::text AS fd,
              c.estado, c.estado_credito, p.full_name
       FROM creditos c LEFT JOIN profiles p ON p.id=c.cliente_id
       WHERE c.codigo_credito=$1`,
      [codigo],
    );
    if (r.rowCount === 0) {
      console.log(`${codigo} | ${header.tomador} | (NO EN DB)`);
      continue;
    }
    const db = r.rows[0];
    const dbTomador = (db.full_name || "").trim();
    const csvTomador = (header.tomador || "").trim();
    const montoMatch = Math.abs(Number(db.monto_solicitado) - header.monto) < 1;
    const fechaMatch = db.fd === header.fechaDesembolso;
    const nameMatch =
      dbTomador &&
      csvTomador &&
      dbTomador.toLowerCase().replace(/\s+/g, "") ===
        csvTomador.toLowerCase().replace(/\s+/g, "");
    const allMatch = montoMatch && fechaMatch && nameMatch;
    const flag = allMatch ? "OK" : "MISMATCH";
    console.log(
      `${codigo} | ${csvTomador} | ${dbTomador} | ${header.monto?.toLocaleString()} | ${Number(db.monto_solicitado).toLocaleString()} | ${header.fechaDesembolso} | ${db.fd} | ${flag} (${db.estado_credito})`,
    );
  }
  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
