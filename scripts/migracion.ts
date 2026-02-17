import fs from 'fs';
import csv from 'csv-parser';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

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

const CSV_FILE_PATH = 'docs/datos_clientes.csv';

// ==========================================
// ZONA DE MAPEO
// ==========================================
// Columnas del CSV:
// Código Crédito, estado, direccion_inmueble, email, Ciudad, tipo_inmueble,
// valor_comercial, valor_colocado, LTV, tasa_nominal, tasa_ea, plazo,
// tipo_liquidacion, tipo_amortizacion, clase, notaria, escritura, costos_notaria,
// Pagador, fecha_llegada_lead, fecha_firma, fecha_registro, dias_notaria,
// fecha_desembolso, dias_registro, dias_totales_desembolso, fecha_control,
// estado_credito, fecha_ultimo_pago, meses_activo, tipo_contrato, mes_registro,
// NIR, doc_priv, CLT, Escrit

// Helpers para parsear valores del CSV
function parseCOPAmount(value: string | undefined): number {
  if (!value) return 0;
  // CSV usa formato US: $450,000,000 (comas = miles, punto = decimal)
  return parseFloat(value.replace(/[$\s",]/g, '')) || 0;
}

function parsePercent(value: string | undefined): number {
  if (!value) return 0;
  return parseFloat(value.replace('%', '').replace(',', '.')) || 0;
}

function parseDateToISO(value: string | undefined): string | null {
  if (!value || value.trim() === '') return null;
  // Formato esperado: DD/MM/YYYY o MM/DD/YYYY
  const parts = value.trim().split('/');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  const y = parseInt(year);
  // Filtrar fechas invalidas (como 31/12/1899)
  if (y < 2000) return null;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function parseBoolSiNo(value: string | undefined): boolean {
  if (!value) return false;
  return value.trim().toLowerCase() === 'si';
}

// Mapear estado del CSV al enum de la DB
function mapEstado(csvEstado: string | undefined): string {
  const estado = (csvEstado || '').trim().toLowerCase();
  const map: Record<string, string> = {
    'solicitado': 'solicitado',
    'aprobado': 'aprobado',
    'publicado': 'publicado',
    'en firma': 'en_firma',
    'en_firma': 'en_firma',
    'firmado': 'firmado',
    'desembolsado': 'activo',
    'activo': 'activo',
    'finalizado': 'finalizado',
    'mora': 'mora',
    'castigado': 'castigado',
    'anulado': 'anulado',
  };
  return map[estado] || 'activo';
}

// Mapear tipo_amortizacion del CSV al enum de la DB
function mapTipoAmortizacion(value: string | undefined): string {
  const v = (value || '').trim().toLowerCase();
  if (v.includes('solo')) return 'solo_interes';
  return 'francesa'; // "Capital e intereses" = francesa
}

// Mapear tipo_liquidacion del CSV al enum de la DB
function mapTipoLiquidacion(value: string | undefined): string {
  const v = (value || '').trim().toLowerCase();
  if (v.includes('anticip')) return 'anticipada';
  return 'vencida';
}

// Mapear tipo_contrato del CSV al enum de la DB
function mapTipoContrato(value: string | undefined): string {
  const v = (value || '').trim().toLowerCase();
  if (v.includes('retro')) return 'retroventa';
  return 'hipotecario'; // "Hipoteca" -> hipotecario
}

function mapRowToData(row: any) {
  const valorComercial = parseCOPAmount(row['valor_comercial']);
  const valorColocado = parseCOPAmount(row['valor_colocado']);

  return {
    // DATOS DEL CLIENTE
    email: (row['email'] || '').trim(),
    passwordTemp: 'Aluri2026!',

    // DATOS DEL CREDITO
    codigoCredito: (row['Código Crédito'] || '').trim(),
    estado: mapEstado(row['estado']),
    direccionInmueble: (row['direccion_inmueble'] || '').trim() || null,
    ciudadInmueble: (row['Ciudad'] || '').trim() || null,
    tipoInmueble: (row['tipo_inmueble'] || '').trim() || null,
    valorComercial: valorComercial || null,
    valorColocado: valorColocado || null,
    montoSolicitado: valorColocado, // Usar valor_colocado como monto_solicitado
    ltv: parsePercent(row['LTV']) || null,
    tasaNominal: parsePercent(row['tasa_nominal']),
    tasaEa: parsePercent(row['tasa_ea']) || null,
    plazo: parseInt(row['plazo'] || '0') || null,
    tipoLiquidacion: mapTipoLiquidacion(row['tipo_liquidacion']),
    tipoAmortizacion: mapTipoAmortizacion(row['tipo_amortizacion']),
    clase: (row['clase'] || '').trim() || null,
    notaria: (row['notaria'] || '').trim() || null,
    escritura: parseInt(row['escritura'] || '0') || null,
    costosNotaria: parseCOPAmount(row['costos_notaria']) || null,
    pagador: (row['Pagador'] || 'deudor').trim().toLowerCase(),
    fechaLlegadaLead: parseDateToISO(row['fecha_llegada_lead']),
    fechaFirma: parseDateToISO(row['fecha_firma']),
    fechaRegistro: parseDateToISO(row['fecha_registro']),
    diasNotaria: parseInt(row['dias_notaria'] || '0') || 0,
    fechaDesembolso: parseDateToISO(row['fecha_desembolso']),
    diasRegistro: parseInt(row['dias_registro'] || '0') || 0,
    diasTotalesDesembolso: parseInt(row['dias_totales_desembolso'] || '0') || 0,
    fechaControl: parseDateToISO(row['fecha_control']),
    estadoCredito: (row['estado_credito'] || 'activo').trim().toLowerCase() === 'pagado' ? 'pagado' : 'activo',
    fechaUltimoPago: parseDateToISO(row['fecha_ultimo_pago ']), // Nota: hay un espacio al final en el CSV
    mesesActivo: parseInt(row['meses_activo'] || '0') || 0,
    tipoContrato: mapTipoContrato(row['tipo_contrato']),
    mesRegistro: parseDateToISO(row['mes_registro']),
    nir: parseInt(row['NIR'] || '0') || null,
    docPriv: parseBoolSiNo(row['doc_priv']),
    clt: parseBoolSiNo(row['CLT']),
    escrit: parseBoolSiNo(row['Escrit']),
  };
}

// ==========================================
// LOGICA DE MIGRACION
// ==========================================
async function migrate() {
  const results: any[] = [];

  console.log('Iniciando lectura del CSV...');

  fs.createReadStream(path.resolve(CSV_FILE_PATH))
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      console.log(`Se encontraron ${results.length} filas. Procesando...\n`);

      let exitosos = 0;
      let fallidos = 0;
      let sinEmail = 0;

      for (const [index, row] of results.entries()) {
        try {
          const data = mapRowToData(row);

          if (!data.email) {
            console.log(`Fila ${index + 1}: Sin email, saltando.`);
            sinEmail++;
            continue;
          }

          if (!data.codigoCredito) {
            console.log(`Fila ${index + 1}: Sin codigo de credito, saltando.`);
            fallidos++;
            continue;
          }

          console.log(`Fila ${index + 1}: ${data.codigoCredito} - ${data.email}`);

          // PASO 1: Crear o Buscar Usuario en Auth
          let userId = '';
          const { data: existingUsers } = await supabase.auth.admin.listUsers();
          const emailLower = data.email.toLowerCase();
          const foundUser = existingUsers.users.find(u => u.email?.toLowerCase() === emailLower);

          if (foundUser) {
            console.log(`   Usuario ya existe. ID: ${foundUser.id}`);
            userId = foundUser.id;
          } else {
            const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
              email: emailLower,
              password: data.passwordTemp,
              email_confirm: true,
              user_metadata: { full_name: data.email.split('@')[0] }
            });

            if (authError) throw new Error(`Auth Error: ${authError.message}`);
            userId = newUser.user!.id;
            console.log(`   Usuario creado. ID: ${userId}`);
          }

          // PASO 2: Verificar que el perfil existe (deberia crearse con trigger)
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', userId)
            .single();

          if (!existingProfile) {
            const { error: profileError } = await supabase
              .from('profiles')
              .upsert({
                id: userId,
                email: data.email,
                full_name: data.email.split('@')[0],
                role: 'propietario',
              });

            if (profileError) throw new Error(`Profile Error: ${profileError.message}`);
            console.log(`   Perfil creado.`);
          }

          // PASO 3: Verificar si el credito ya existe
          const { data: existingCredit } = await supabase
            .from('creditos')
            .select('id')
            .eq('codigo_credito', data.codigoCredito)
            .single();

          if (existingCredit) {
            console.log(`   Credito ${data.codigoCredito} ya existe. Saltando.`);
            exitosos++;
            continue;
          }

          // PASO 4: Crear Credito con TODAS las columnas del CSV
          const { error: creditError } = await supabase
            .from('creditos')
            .insert({
              cliente_id: userId,
              codigo_credito: data.codigoCredito,
              estado: data.estado,
              direccion_inmueble: data.direccionInmueble,
              ciudad_inmueble: data.ciudadInmueble,
              tipo_inmueble: data.tipoInmueble,
              valor_comercial: data.valorComercial,
              monto_solicitado: data.montoSolicitado || 0,
              valor_colocado: data.valorColocado || 0,
              ltv: data.ltv,
              tasa_nominal: data.tasaNominal,
              tasa_interes_ea: data.tasaEa,
              plazo: data.plazo || 0,
              tipo_liquidacion: data.tipoLiquidacion,
              tipo_amortizacion: data.tipoAmortizacion,
              clase: data.clase,
              notaria: data.notaria,
              escritura: data.escritura,
              costos_notaria: data.costosNotaria,
              pagador: data.pagador,
              fecha_llegada_lead: data.fechaLlegadaLead,
              fecha_firma: data.fechaFirma,
              fecha_registro: data.fechaRegistro,
              dias_notaria: data.diasNotaria,
              fecha_desembolso: data.fechaDesembolso,
              dias_registro: data.diasRegistro,
              dias_totales_desembolso: data.diasTotalesDesembolso,
              fecha_control: data.fechaControl,
              estado_credito: data.estadoCredito,
              fecha_ultimo_pago: data.fechaUltimoPago,
              meses_activo: data.mesesActivo,
              tipo_contrato: data.tipoContrato,
              mes_registro: data.mesRegistro,
              nir: data.nir,
              doc_priv: data.docPriv,
              clt: data.clt,
              escrit: data.escrit,
              // Saldos iniciales
              saldo_capital: data.valorColocado || 0,
              saldo_intereses: 0,
              saldo_mora: 0,
              ingresos_mensuales: 0,
              profesion: null,
              producto: 'consumo',
            });

          if (creditError) throw new Error(`Credit Error: ${creditError.message}`);
          console.log(`   Credito ${data.codigoCredito} creado.`);

          exitosos++;

        } catch (error: any) {
          console.error(`Error en fila ${index + 1}:`, error.message);
          fallidos++;
        }
      }

      console.log(`\n=============================`);
      console.log(`Migracion Finalizada.`);
      console.log(`Exitosos: ${exitosos}`);
      console.log(`Fallidos: ${fallidos}`);
      console.log(`Sin email: ${sinEmail}`);
      console.log(`=============================`);
    });
}

migrate();
