const { Client } = require("pg");
const c = new Client({ ssl: { rejectUnauthorized: false } });

(async () => {
  await c.connect();

  const cnt = await c.query("SELECT COUNT(*) FROM storage.objects WHERE bucket_id='properties'");
  console.log("Objects en bucket properties:", cnt.rows[0].count);

  const folders = await c.query(
    "SELECT split_part(name,'/',1) AS folder, count(*) FROM storage.objects WHERE bucket_id='properties' GROUP BY folder ORDER BY folder",
  );
  console.log("\nFolders:");
  for (const x of folders.rows) console.log(" ", x.folder, ":", x.count);

  // Fetch all expected paths from DB URLs and check existence
  const rows = await c.query(`
    SELECT c.codigo_credito, url.v AS url,
           regexp_replace(url.v, '^https?://[^/]+/storage/v1/object/public/properties/', '') AS raw_path
    FROM creditos c, jsonb_array_elements_text(c.fotos_inmueble) AS url(v)
    WHERE c.fotos_inmueble IS NOT NULL
  `);
  const decoded = rows.rows.map((r) => {
    let p = r.raw_path;
    try {
      p = decodeURIComponent(p);
    } catch {}
    return { ...r, decoded: p };
  });

  const existsRes = await c.query(
    `SELECT name FROM storage.objects WHERE bucket_id='properties' AND name = ANY($1)`,
    [decoded.map((d) => d.decoded)],
  );
  const existing = new Set(existsRes.rows.map((r) => r.name));

  let found = 0,
    missing = [];
  for (const r of decoded) {
    if (existing.has(r.decoded)) found++;
    else missing.push(r);
  }
  console.log(`\nURLs en DB: ${decoded.length}`);
  console.log(`  Con archivo en bucket: ${found}`);
  console.log(`  Sin archivo: ${missing.length}`);
  if (missing.length) {
    console.log("\nPrimeros 10 missing:");
    for (const m of missing.slice(0, 10))
      console.log(`  ${m.codigo_credito}  ->  ${m.decoded}`);
  }
  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
