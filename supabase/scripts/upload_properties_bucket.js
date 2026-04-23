/**
 * Sube todos los archivos de ./backup-properties/properties al bucket
 * `properties` del proyecto nuevo usando service role key.
 *
 * Preserva la estructura de paths: backup-properties/properties/CR001/fotos/foto.jpg
 * -> object en bucket properties en path CR001/fotos/foto.jpg
 *
 * Idempotente: si el object ya existe lo sobrescribe (upsert: true).
 */
require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const mime = require("mime-types");
const { createClient } = require("@supabase/supabase-js");

const BASE_DIR = path.resolve("backup-properties/properties");
const BUCKET = "properties";
const CONCURRENCY = 8;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}
console.log("Target:", supabaseUrl, "bucket:", BUCKET);

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.isFile()) acc.push(full);
  }
  return acc;
}

async function upload(file) {
  const objectPath = path.relative(BASE_DIR, file).replace(/\\/g, "/");
  const body = fs.readFileSync(file);
  const contentType = mime.lookup(file) || "application/octet-stream";
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(objectPath, body, { contentType, upsert: true });
  if (error) return { objectPath, ok: false, error: error.message };
  return { objectPath, ok: true, size: body.length };
}

async function runBatched(items, limit, fn) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      const r = await fn(items[idx]);
      results[idx] = r;
      if ((idx + 1) % 50 === 0 || idx === items.length - 1) {
        const ok = results.filter((x) => x?.ok).length;
        const fail = results.filter((x) => x && !x.ok).length;
        console.log(`  ${idx + 1}/${items.length}  ok=${ok}  fail=${fail}`);
      }
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

(async () => {
  if (!fs.existsSync(BASE_DIR)) {
    console.error("No existe:", BASE_DIR);
    process.exit(1);
  }
  const files = walk(BASE_DIR);
  console.log(`Archivos a subir: ${files.length}`);
  const t0 = Date.now();
  const results = await runBatched(files, CONCURRENCY, upload);
  const ok = results.filter((r) => r.ok);
  const fail = results.filter((r) => !r.ok);
  console.log(`\nListo en ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`  OK: ${ok.length}`);
  console.log(`  FAIL: ${fail.length}`);
  if (fail.length) {
    console.log("\nFallos (primeros 20):");
    for (const f of fail.slice(0, 20)) console.log("  -", f.objectPath, "->", f.error);
  }
})();
