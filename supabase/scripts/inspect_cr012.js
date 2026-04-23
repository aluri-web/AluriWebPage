const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const file = path.join(
  "C:\\Users\\pcaic\\Documents\\Aluri\\Creditos CSV",
  "Operaciones Aluri - CR012.csv",
);
const raw = fs.readFileSync(file, "utf8");
const lines = raw.split(/\r?\n/);

function splitCsv(l) {
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

// Dump first ~25 rows of AMORTIZACIÓN section
let started = false;
let count = 0;
for (const l of lines) {
  if (!l.trim()) continue;
  if (/AMORTIZACI[ÓO]N INICIAL/i.test(l)) {
    started = true;
    continue;
  }
  if (!started) continue;
  if (/^Periodos,/i.test(l)) continue;
  const cols = splitCsv(l);
  if (cols.length < 11) continue;
  console.log("row:", cols.slice(0, 12).join(" | "));
  if (++count > 8) break;
}

// Also dump header section
console.log("\n--- Header rows ---");
for (let i = 0; i < 20; i++) {
  if (!lines[i]) continue;
  console.log(i, lines[i].substring(0, 120));
}

(async () => {
  const c = new Client({ ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query(
    "SELECT p.id, p.full_name, p.email FROM profiles p JOIN creditos c ON c.cliente_id=p.id WHERE c.codigo_credito='CR022'",
  );
  console.log("\n--- Cliente CR022 ---");
  console.log(JSON.stringify(r.rows[0], null, 2));
  const inv = await c.query(
    "SELECT i.inversionista_id, i.porcentaje_participacion, i.monto_invertido, p.full_name FROM inversiones i JOIN profiles p ON p.id=i.inversionista_id JOIN creditos c ON c.id=i.credito_id WHERE c.codigo_credito='CR022'",
  );
  console.log("\n--- Inversiones CR022 ---");
  console.log(JSON.stringify(inv.rows, null, 2));
  // Look for Sergio Andres Velandia profile
  const sergio = await c.query(
    "SELECT id, full_name, email FROM profiles WHERE full_name ILIKE '%Sergio%Velandia%' OR full_name ILIKE '%Velandia%Sergio%'",
  );
  console.log("\n--- Sergio profiles ---");
  console.log(JSON.stringify(sergio.rows, null, 2));
  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
