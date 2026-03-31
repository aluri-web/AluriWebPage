/**
 * Sube archivos del DATAROOM local a Supabase Storage
 * manteniendo la estructura de carpetas.
 *
 * Uso: node scripts/upload-dataroom.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, extname, relative } from 'path'
import { config } from 'dotenv'

config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const BUCKET = 'properties'
const TARGET_BASE = 'dataroom/privado'

const SOURCE_DIR = 'C:\\Users\\pcaic\\Documents\\Aluri\\DATAROOM-20260316T214327Z-3-001\\DATAROOM'

const CONTENT_TYPES = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.csv': 'text/csv',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.html': 'text/html',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
}

function sanitizeName(name) {
  // Keep readable but remove problematic chars for storage
  return name
    .replace(/[áÁ]/g, 'a').replace(/[éÉ]/g, 'e').replace(/[íÍ]/g, 'i')
    .replace(/[óÓ]/g, 'o').replace(/[úÚ]/g, 'u').replace(/[ñÑ]/g, 'n')
    .replace(/[^a-zA-Z0-9._\-\/]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

function getAllFiles(dir, base = dir) {
  const results = []
  const entries = readdirSync(dir)

  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      results.push(...getAllFiles(fullPath, base))
    } else {
      const rel = relative(base, fullPath).replace(/\\/g, '/')
      results.push({ fullPath, relativePath: rel, size: stat.size })
    }
  }

  return results
}

async function ensureFolder(folderPath) {
  const placeholder = `${folderPath}/.folder`
  await supabase.storage.from(BUCKET).upload(placeholder, new Blob(['']), {
    contentType: 'text/plain',
    upsert: true,
  })
}

async function main() {
  console.log('Scanning files...')
  const files = getAllFiles(SOURCE_DIR)
  console.log(`Found ${files.length} files\n`)

  // Collect unique folders
  const folders = new Set()
  for (const file of files) {
    const parts = file.relativePath.split('/')
    for (let i = 1; i < parts.length; i++) {
      const folderRel = parts.slice(0, i).join('/')
      const sanitized = folderRel.split('/').map(sanitizeName).join('/')
      folders.add(`${TARGET_BASE}/${sanitized}`)
    }
  }

  // Create folders
  console.log(`Creating ${folders.size} folders...`)
  for (const folder of folders) {
    await ensureFolder(folder)
    console.log(`  📁 ${folder}`)
  }
  console.log()

  // Upload files
  let uploaded = 0
  let failed = 0

  for (const file of files) {
    const sanitizedRel = file.relativePath.split('/').map(sanitizeName).join('/')
    const storagePath = `${TARGET_BASE}/${sanitizedRel}`
    const ext = extname(file.fullPath).toLowerCase()
    const contentType = CONTENT_TYPES[ext] || 'application/octet-stream'

    process.stdout.write(`  [${uploaded + failed + 1}/${files.length}] ${file.relativePath} (${(file.size / 1024 / 1024).toFixed(1)}MB)...`)

    try {
      const fileBuffer = readFileSync(file.fullPath)
      const { error } = await supabase.storage.from(BUCKET).upload(storagePath, fileBuffer, {
        contentType,
        cacheControl: '3600',
        upsert: true,
      })

      if (error) {
        console.log(` ❌ ${error.message}`)
        failed++
      } else {
        console.log(' ✅')
        uploaded++
      }
    } catch (err) {
      console.log(` ❌ ${err.message}`)
      failed++
    }
  }

  console.log(`\n${'='.repeat(50)}`)
  console.log(`Done! ${uploaded} uploaded, ${failed} failed out of ${files.length}`)
}

main().catch(console.error)
