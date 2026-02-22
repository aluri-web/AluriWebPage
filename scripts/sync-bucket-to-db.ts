import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno
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

const BUCKET = 'properties';

async function syncBucketToDb() {
  console.log('=== Sincronizando bucket "properties" con la DB ===\n');

  // 1. Listar carpetas de primer nivel (CR001, CR002, etc.)
  const { data: topLevel, error: listError } = await supabase
    .storage
    .from(BUCKET)
    .list('', { limit: 1000, sortBy: { column: 'name', order: 'asc' } });

  if (listError) {
    console.error('Error listando bucket:', listError.message);
    process.exit(1);
  }

  // Filtrar solo directorios (id === null en Supabase Storage)
  const folders = (topLevel || []).filter(item => item.id === null);

  if (folders.length === 0) {
    console.log('No se encontraron carpetas en el bucket.');
    return;
  }

  console.log(`Encontradas ${folders.length} carpetas\n`);

  let totalFotos = 0;
  let totalDocs = 0;
  let totalCreditos = 0;

  for (const folder of folders) {
    const codigoCredito = folder.name;

    // 2. Listar fotos en /fotos/
    const { data: fotos } = await supabase.storage
      .from(BUCKET)
      .list(`${codigoCredito}/fotos`, { limit: 200 });

    const fotoUrls = (fotos || [])
      .filter(f => f.id !== null) // Solo archivos, no subdirectorios
      .map(f => {
        const { data } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(`${codigoCredito}/fotos/${f.name}`);
        return data.publicUrl;
      });

    // 3. Actualizar creditos (solo fotos por ahora)
    const updateData: Record<string, unknown> = { fotos_inmueble: fotoUrls }

    // Documentos: solo si la columna existe (migración aplicada)
    const { data: docs } = await supabase.storage
      .from(BUCKET)
      .list(`${codigoCredito}/documentos`, { limit: 200 });

    const docUrls = (docs || [])
      .filter(f => f.id !== null)
      .map(f => {
        const { data } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(`${codigoCredito}/documentos/${f.name}`);
        return data.publicUrl;
      });

    // Intentar con documentos; si falla, solo fotos
    let { error: updateError } = await supabase
      .from('creditos')
      .update({ ...updateData, documentos_inmueble: docUrls })
      .eq('codigo_credito', codigoCredito);

    if (updateError?.message?.includes('documentos_inmueble')) {
      ({ error: updateError } = await supabase
        .from('creditos')
        .update(updateData)
        .eq('codigo_credito', codigoCredito));
    }

    if (updateError) {
      console.error(`  ✗ ${codigoCredito}: ${updateError.message}`);
    } else {
      console.log(`  ${codigoCredito}: ${fotoUrls.length} fotos, ${docUrls.length} documentos`);
      totalFotos += fotoUrls.length;
      totalDocs += docUrls.length;
      totalCreditos++;
    }
  }

  console.log(`\n=== Resumen ===`);
  console.log(`Creditos actualizados: ${totalCreditos}`);
  console.log(`Total fotos: ${totalFotos}`);
  console.log(`Total documentos: ${totalDocs}`);
}

syncBucketToDb().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
