/**
 * Script: Corregir nombres de propietarios en tabla profiles
 * Actualiza full_name basándose en email
 *
 * Uso: npx tsx scripts/fix-propietario-names.ts
 * Agregar --dry-run para solo ver los cambios sin aplicarlos
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SERVICE_ROLE_KEY) {
  console.error('ERROR: Falta la variable SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// Mapeo email → nombre correcto (de la tabla del usuario)
const CORRECTIONS: { email: string; full_name: string }[] = [
  { email: 'velaasociados@outlook.com', full_name: 'Camilo Vela' },
  { email: 'jesusgiraldo1271@gmail.com', full_name: 'Jesus Giraldo' },
  { email: 'sandravaldesromana@gmail.com', full_name: 'Sandra Valdes' },
  { email: 'juanrgomezm97@gmail.com', full_name: 'Juan Ramiro Gomez' },
  { email: 'husebasll@gmail.com', full_name: 'Hugo Sebastian Lozano' },
  { email: 'benjaminrdra@gmail.com', full_name: 'Benjamin Rodriguez' },
  { email: 'robinsonlozano2@gmail.com', full_name: 'Jhon Lozano' },
  { email: 'negocios.w@gmail.com', full_name: 'William Quintero' },
  { email: 'gerencia@rcltda.com', full_name: 'Construcciones Rodriguez' },
  { email: 'alejo2020rincon@gmail.com', full_name: 'Alejandro Rincon' },
  { email: 'miguelarb.8696@gmail.com', full_name: 'Miguel Rojas' },
  { email: 'cesargus4@gmail.com', full_name: 'Jorge Humberto Alzate' },
  { email: 'edwbemo@gmail.com', full_name: 'Edwin Bernal' },
  { email: 'guillermodebacker.gdb@gmail.com', full_name: 'Guillermo de Backer' },
  { email: 'francisco.cardona287@gmail.com', full_name: 'Francisco Alonso Cardona' },
  { email: 'mutaahhit@hotmail.com', full_name: 'Janeth Forero' },
  { email: 'directorejecutivo@cybercard.com.co', full_name: 'Holding Club Cybercard' },
  { email: 'giovasotelo14@hotmail.com', full_name: 'Giovanni Orlando Sotelo Ramirez' },
  { email: 'pobladocp@gmail.com', full_name: 'Poblado Corp. Group SAS' },
  // ⚠️ Email cortado en imagen — verificar:
  { email: 'miguel.molina2592@correo.policia.gov.co', full_name: 'Miguel Angel Molina Perez' },
  { email: 'beltrancacereslaura@gmail.com', full_name: 'Laura Beltran' },
  { email: 'gerencia@rootedhouse.com.co', full_name: 'Rooted house' },
  { email: 'robeiroosoriogaleano@gmail.com', full_name: 'Robeiro Osorio Galeano' },
  // ⚠️ Email cortado en imagen — verificar:
  { email: 'salazarperdomopatricia6@gmail.com', full_name: 'Patricia Salazar Perdomo' },
]

const isDryRun = process.argv.includes('--dry-run')

async function main() {
  console.log(isDryRun ? '🔍 DRY RUN — no se aplicarán cambios\n' : '🚀 Aplicando correcciones...\n')

  let updated = 0
  let skipped = 0
  let notFound = 0

  for (const { email, full_name } of CORRECTIONS) {
    // Buscar profile por email (case-insensitive)
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .ilike('email', email)
      .single()

    if (fetchError || !profile) {
      console.log(`  ❌ No encontrado: ${email}`)
      notFound++
      continue
    }

    if (profile.full_name === full_name) {
      console.log(`  ✅ Ya correcto: ${email} → "${full_name}"`)
      skipped++
      continue
    }

    console.log(`  📝 ${email}: "${profile.full_name}" → "${full_name}" (role: ${profile.role})`)

    if (!isDryRun) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ full_name })
        .eq('id', profile.id)

      if (updateError) {
        console.log(`     ⚠️  Error actualizando: ${updateError.message}`)
      } else {
        updated++
      }
    } else {
      updated++
    }
  }

  console.log(`\n--- Resumen ---`)
  console.log(`Actualizados: ${updated}`)
  console.log(`Ya correctos: ${skipped}`)
  console.log(`No encontrados: ${notFound}`)
}

main().catch(console.error)
