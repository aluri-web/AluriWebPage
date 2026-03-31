/**
 * Inlinea dependencias CDN externas en archivos HTML
 * para que funcionen sin acceso a internet/firewalls estrictos.
 *
 * - Chart.js → inlinea el JS completo
 * - Google Fonts → descarga CSS + fuentes WOFF2, inlinea todo como base64
 *
 * Uso: node scripts/inline-deps.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const SOURCE_DIR = 'C:\\Users\\pcaic\\Documents\\Aluri\\Presentaciones Aluri'

// Cache for fetched resources
const cache = new Map()

async function fetchCached(url) {
  if (cache.has(url)) return cache.get(url)
  console.log(`    Downloading: ${url.substring(0, 80)}...`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  const text = await res.text()
  cache.set(url, text)
  return text
}

async function fetchBinaryCached(url) {
  const key = `bin:${url}`
  if (cache.has(key)) return cache.get(key)
  console.log(`    Downloading font: ${url.substring(0, 80)}...`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const b64 = buf.toString('base64')
  cache.set(key, b64)
  return b64
}

/**
 * Download Google Fonts CSS, then download each woff2 font referenced in it
 * and replace the URLs with inline base64 data URIs.
 */
async function inlineGoogleFontsCSS(cssUrl) {
  // Fetch the CSS with a modern user-agent to get woff2
  const cacheKey = `gfcss:${cssUrl}`
  if (cache.has(cacheKey)) return cache.get(cacheKey)

  console.log(`    Downloading Google Fonts CSS...`)
  const res = await fetch(cssUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    },
  })
  let css = await res.text()

  // Find all url() references to font files
  const urlRegex = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g
  const matches = [...css.matchAll(urlRegex)]

  for (const match of matches) {
    const fontUrl = match[1]
    const b64 = await fetchBinaryCached(fontUrl)
    const format = fontUrl.includes('.woff2') ? 'woff2' : 'woff'
    css = css.replace(fontUrl, `data:font/${format};base64,${b64}`)
  }

  cache.set(cacheKey, css)
  return css
}

function getAllHtmlFiles(dir) {
  const results = []
  const entries = readdirSync(dir)
  for (const entry of entries) {
    if (entry === 'node_modules') continue
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      results.push(...getAllHtmlFiles(fullPath))
    } else if (entry.endsWith('.html')) {
      results.push(fullPath)
    }
  }
  return results
}

async function processFile(filePath) {
  let html = readFileSync(filePath, 'utf-8')
  let modified = false

  // 1) Inline Chart.js
  const chartjsRegex = /<script\s+src="(https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/Chart\.js\/[^"]+)"[^>]*><\/script>/g
  const chartjsMatch = chartjsRegex.exec(html)
  if (chartjsMatch) {
    const chartUrl = chartjsMatch[1]
    const chartCode = await fetchCached(chartUrl)
    html = html.replace(chartjsMatch[0], `<script>/* Chart.js 4.4.1 inlined */\n${chartCode}\n</script>`)
    modified = true
  }

  // 2) Inline Google Fonts
  const gfRegex = /<link[^>]+href="(https:\/\/fonts\.googleapis\.com\/css2\?[^"]+)"[^>]*\/?>/g
  let gfMatch
  while ((gfMatch = gfRegex.exec(html)) !== null) {
    const cssUrl = gfMatch[1].replace(/&amp;/g, '&')
    const inlinedCSS = await inlineGoogleFontsCSS(cssUrl)
    html = html.replace(gfMatch[0], `<style>/* Google Fonts inlined */\n${inlinedCSS}\n</style>`)
    modified = true
  }

  if (modified) {
    writeFileSync(filePath, html, 'utf-8')
  }

  return modified
}

async function main() {
  const files = getAllHtmlFiles(SOURCE_DIR)
  console.log(`Found ${files.length} HTML files\n`)

  let processed = 0
  let skipped = 0

  for (const file of files) {
    const rel = file.replace(SOURCE_DIR + '\\', '').replace(/\\/g, '/')
    process.stdout.write(`[${processed + skipped + 1}/${files.length}] ${rel}`)

    const wasModified = await processFile(file)

    if (wasModified) {
      console.log(' ✅ inlined')
      processed++
    } else {
      console.log(' — no CDN deps')
      skipped++
    }
  }

  console.log(`\n${'='.repeat(50)}`)
  console.log(`Done! ${processed} files inlined, ${skipped} already self-contained`)
}

main().catch(console.error)
