import fs from 'fs';
import csv from 'csv-parser';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

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

const CSV_FILE_PATH = 'docs/datos_inversiones.csv';

// ==========================================
// CSV separado por ;
// ==========================================
// Código Crédito;Estado;...;Inversionista 1;% Participación 1;...hasta 5

function parsePercent(value: string | undefined): number | null {
  if (!value || value.trim() === '') return null;
  // Formato colombiano: 100,00% → 100.00
  return parseFloat(value.replace('%', '').replace(',', '.')) || null;
}

// Extraer pares (nombre inversionista, porcentaje) de cada fila
function extractInvestors(row: any): { nombre: string; porcentaje: number | null }[] {
  const investors: { nombre: string; porcentaje: number | null }[] = [];
  const keys = Object.keys(row);

  for (let i = 1; i <= 5; i++) {
    // Buscar columna "Inversionista N" por contenido parcial (encoding corrupto)
    const invKey = keys.find(k => k.includes(`Inversionista ${i}`) || k.includes(`inversionista ${i}`));
    const pctKey = keys.find(k => (k.includes(`Participaci`) || k.includes(`participaci`)) && k.includes(`${i}`));

    const nombre = invKey ? (row[invKey] || '').trim() : '';
    const porcentaje = pctKey ? parsePercent(row[pctKey]) : null;

    if (nombre) {
      investors.push({ nombre, porcentaje });
    }
  }

  return investors;
}

// ==========================================
// LOGICA DE MIGRACION
// ==========================================
async function migrate() {
  const results: any[] = [];

  console.log('Cargando perfiles de inversionistas...');

  // Pre-cargar todos los profiles para buscar por nombre
  const { data: allProfiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name')

  if (profilesError || !allProfiles) {
    console.error('Error cargando profiles:', profilesError?.message);
    process.exit(1);
  }

  // Crear mapa nombre (lowercase) → id
  const profileMap = new Map<string, string>();
  for (const p of allProfiles) {
    if (p.full_name) {
      profileMap.set(p.full_name.toLowerCase(), p.id);
    }
  }
  console.log(`   ${profileMap.size} perfiles cargados.\n`);

  console.log('Leyendo CSV de inversiones...');

  fs.createReadStream(path.resolve(CSV_FILE_PATH))
    .pipe(csv({ separator: ';' }))
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      console.log(`Se encontraron ${results.length} filas. Procesando...\n`);

      let inversionesCreadas = 0;
      let inversionesFallidas = 0;
      let creditosNoEncontrados = 0;
      let inversionistasNoEncontrados: string[] = [];

      for (const [index, row] of results.entries()) {
        // Buscar codigo_credito (encoding corrupto en encabezado)
        const codigoKey = Object.keys(row).find(k => k.includes('digo') || k.includes('Cr'));
        const codigoCredito = codigoKey ? (row[codigoKey] || '').trim() : '';

        if (!codigoCredito) continue;

        console.log(`Fila ${index + 1}: ${codigoCredito}`);

        // Buscar credito en DB
        const { data: credito, error: creditoError } = await supabase
          .from('creditos')
          .select('id, valor_colocado')
          .eq('codigo_credito', codigoCredito)
          .single();

        if (creditoError || !credito) {
          console.log(`   Credito ${codigoCredito} no encontrado en DB. Saltando.`);
          creditosNoEncontrados++;
          continue;
        }

        const valorColocado = credito.valor_colocado || 0;

        // Extraer inversionistas de la fila
        const investors = extractInvestors(row);

        if (investors.length === 0) {
          console.log(`   Sin inversionistas en esta fila.`);
          continue;
        }

        // Si hay inversionistas sin porcentaje, distribuir equitativamente
        const hasEmptyPct = investors.some(inv => inv.porcentaje === null);
        if (hasEmptyPct) {
          const equalPct = Math.round((100 / investors.length) * 100) / 100;
          investors.forEach(inv => {
            if (inv.porcentaje === null) inv.porcentaje = equalPct;
          });
        }

        for (const inv of investors) {
          // Buscar inversionista por nombre
          const invId = profileMap.get(inv.nombre.toLowerCase());

          if (!invId) {
            console.log(`   Inversionista "${inv.nombre}" no encontrado en profiles.`);
            inversionistasNoEncontrados.push(inv.nombre);
            inversionesFallidas++;
            continue;
          }

          const porcentaje = inv.porcentaje || 0;
          const montoInvertido = Math.round(valorColocado * porcentaje / 100);

          // Verificar si ya existe esta inversión
          const { data: existing } = await supabase
            .from('inversiones')
            .select('id')
            .eq('credito_id', credito.id)
            .eq('inversionista_id', invId)
            .single();

          if (existing) {
            console.log(`   ${inv.nombre} (${porcentaje}%) → ya existe. Saltando.`);
            inversionesCreadas++;
            continue;
          }

          const { error: insertError } = await supabase
            .from('inversiones')
            .insert({
              credito_id: credito.id,
              inversionista_id: invId,
              monto_invertido: montoInvertido,
              porcentaje_participacion: porcentaje,
              estado: 'activo',
            });

          if (insertError) {
            console.error(`   Error insertando inversión de ${inv.nombre}: ${insertError.message}`);
            inversionesFallidas++;
          } else {
            console.log(`   ${inv.nombre} → $${montoInvertido.toLocaleString()} (${porcentaje}%) ✓`);
            inversionesCreadas++;
          }
        }
      }

      // Resumen
      console.log(`\n=============================`);
      console.log(`Migracion Inversiones Finalizada.`);
      console.log(`Inversiones creadas: ${inversionesCreadas}`);
      console.log(`Inversiones fallidas: ${inversionesFallidas}`);
      console.log(`Creditos no encontrados: ${creditosNoEncontrados}`);

      if (inversionistasNoEncontrados.length > 0) {
        const unicos = [...new Set(inversionistasNoEncontrados)];
        console.log(`Inversionistas no encontrados: ${unicos.join(', ')}`);
      }

      console.log(`=============================`);
    });
}

migrate();
