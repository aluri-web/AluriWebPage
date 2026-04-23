const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const file = path.join(
  "C:\\Users\\pcaic\\Documents\\Aluri\\Creditos CSV",
  "Operaciones Aluri - CR002.csv",
);
const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);

function split(l) {
  const out = [];
  let cur = "",
    inQ = false;
  for (let i = 0; i < l.length; i++) {
    const ch = l[i];
    if (ch === '"') inQ = !inQ;
    else if (ch === "," && !inQ) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

console.log("=== CSV CR002 ABONOS (col 9=fecha, col 10=monto) ===");
let started = false;
for (const l of lines) {
  if (!l.trim()) continue;
  if (/AMORTIZACI[ÓO]N INICIAL/i.test(l)) {
    started = true;
    continue;
  }
  if (!started) continue;
  if (/^Periodos,/i.test(l)) continue;
  const cols = split(l);
  if (cols.length < 11) continue;
  const f = (cols[9] || "").trim(),
    a = (cols[10] || "").trim();
  if (f && a) console.log("  ", f, "->", a);
}

(async () => {
  const c = new Client({ ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query(`
    SELECT t.fecha_aplicacion::text AS fecha, t.tipo_transaccion, t.monto, t.referencia_pago
    FROM transacciones t JOIN creditos c ON c.id=t.credito_id
    WHERE c.codigo_credito='CR002' AND t.tipo_transaccion LIKE 'pago_%'
    ORDER BY t.fecha_aplicacion, t.tipo_transaccion`);
  console.log("\n=== DB CR002 transacciones ===");
  const byDate = {};
  for (const x of r.rows) {
    byDate[x.fecha] = byDate[x.fecha] || {
      pago_capital: 0,
      pago_interes: 0,
      pago_mora: 0,
      total: 0,
    };
    byDate[x.fecha][x.tipo_transaccion] = Number(x.monto);
    byDate[x.fecha].total += Number(x.monto);
  }
  for (const d of Object.keys(byDate).sort()) {
    const b = byDate[d];
    console.log(
      `  ${d}  total=$${b.total.toLocaleString()}  cap=$${b.pago_capital.toLocaleString()}  int=$${b.pago_interes.toLocaleString()}  mora=$${b.pago_mora.toLocaleString()}`,
    );
  }
  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
