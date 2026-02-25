import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SERVICE_ROLE_KEY) {
  console.error('ERROR: Falta la variable SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const BUCKET = 'properties';

// Ruta a la carpeta local con subcarpetas CRXXX/fotos/
const LOCAL_DIR = process.argv[2];

if (!LOCAL_DIR) {
  console.error('Uso: npx ts-node scripts/upload-fotos.ts <ruta-carpeta>');
  console.error('Ejemplo: npx ts-node scripts/upload-fotos.ts "C:/fotos-creditos"');
  console.error('\nEstructura esperada:');
  console.error('  <carpeta>/');
  console.error('    CR001/');
  console.error('      foto1.jpg');
  console.error('      foto2.png');
  console.error('    CR002/');
  console.error('      img1.jpg');
  process.exit(1);
}

const VALID_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic'];

function getMimeType(ext: string): string {
  const types: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.heic': 'image/heic',
  };
  return types[ext] || 'application/octet-stream';
}

async function clearBucketFolder(codigoCredito: string) {
  const { data: existing } = await supabase.storage
    .from(BUCKET)
    .list(`${codigoCredito}/fotos`, { limit: 500 });

  const filesToRemove = (existing || [])
    .filter(f => f.id !== null)
    .map(f => `${codigoCredito}/fotos/${f.name}`);

  if (filesToRemove.length > 0) {
    const { error } = await supabase.storage.from(BUCKET).remove(filesToRemove);
    if (error) {
      console.error(`    ✗ Error limpiando bucket: ${error.message}`);
    } else {
      console.log(`    Limpiadas ${filesToRemove.length} fotos viejas del bucket`);
    }
  }
}

async function uploadFotos() {
  const absDir = path.resolve(LOCAL_DIR);

  if (!fs.existsSync(absDir)) {
    console.error(`La carpeta no existe: ${absDir}`);
    process.exit(1);
  }

  console.log(`=== Subiendo fotos desde ${absDir} ===\n`);

  // Listar subcarpetas — solo las que empiezan con CR (codigo de credito)
  const entries = fs.readdirSync(absDir, { withFileTypes: true });
  const folders = entries.filter(e => e.isDirectory() && /^CR\d+$/i.test(e.name));

  if (folders.length === 0) {
    console.log('No se encontraron subcarpetas CR___.');
    return;
  }

  console.log(`Encontradas ${folders.length} carpetas de credito\n`);

  let totalUploaded = 0;
  let totalCleaned = 0;
  let totalErrors = 0;

  for (const folder of folders) {
    const codigoCredito = folder.name;
    const fotosDir = path.join(absDir, codigoCredito, 'fotos');

    // Solo usar la subcarpeta fotos/ — ignorar archivos sueltos
    if (!fs.existsSync(fotosDir)) {
      console.log(`  ${codigoCredito}: sin carpeta fotos/, saltando`);
      continue;
    }

    const files = fs.readdirSync(fotosDir, { withFileTypes: true })
      .filter(f => f.isFile() && VALID_EXTENSIONS.includes(path.extname(f.name).toLowerCase()));

    if (files.length === 0) {
      console.log(`  ${codigoCredito}: carpeta fotos/ vacia, saltando`);
      continue;
    }

    console.log(`  ${codigoCredito}: ${files.length} fotos encontradas`);

    // Limpiar fotos viejas del bucket antes de subir
    await clearBucketFolder(codigoCredito);
    totalCleaned++;

    for (const file of files) {
      const filePath = path.join(fotosDir, file.name);
      const storagePath = `${codigoCredito}/fotos/${file.name}`;
      const ext = path.extname(file.name).toLowerCase();

      const fileBuffer = fs.readFileSync(filePath);

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, fileBuffer, {
          contentType: getMimeType(ext),
          upsert: true,
        });

      if (error) {
        console.error(`    ✗ ${file.name}: ${error.message}`);
        totalErrors++;
      } else {
        console.log(`    ✓ ${file.name}`);
        totalUploaded++;
      }
    }
  }

  console.log(`\n=== Resumen ===`);
  console.log(`Creditos procesados: ${totalCleaned}`);
  console.log(`Fotos subidas: ${totalUploaded}`);
  console.log(`Errores: ${totalErrors}`);
  console.log(`\nAhora ejecuta: npx tsx scripts/sync-bucket-to-db.ts`);
}

uploadFotos().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
