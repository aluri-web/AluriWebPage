import { toCardinal } from 'n2words/es-ES'

const MESES = [
  '',
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

function capitalizar(texto: string): string {
  if (!texto) return texto
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/**
 * Devuelve los componentes de la fecha en zona horaria Colombia (America/Bogota).
 * Los nombres de archivo, fechas legales y paths de storage siempre deben
 * usar hora Colombia independiente de donde corra el server (Vercel = UTC/Europa).
 */
export function colombiaDateParts(date: Date = new Date()): {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
} {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts: Record<string, string> = {}
  for (const p of fmt.formatToParts(date)) {
    parts[p.type] = p.value
  }
  return {
    year: parseInt(parts.year, 10),
    month: parseInt(parts.month, 10),
    day: parseInt(parts.day, 10),
    hour: parseInt(parts.hour, 10) % 24,
    minute: parseInt(parts.minute, 10),
    second: parseInt(parts.second, 10),
  }
}

export function numeroATexto(n: number): string {
  const texto = toCardinal(Math.trunc(n))
  return texto.replace(/dieciseis/g, 'dieciséis')
}

/**
 * Convierte un porcentaje (string como "2", "1.80", "1,5") a su forma en letras
 * para uso legal: "Dos por ciento", "Uno coma ochenta por ciento", etc.
 * Si la parte decimal es solo ceros, los omite ("2.00" → "Dos por ciento").
 */
export function porcentajeATexto(pct: string): string {
  if (!pct) return ''
  const limpio = pct.replace(',', '.').replace(/[^\d.]/g, '').trim()
  if (!limpio) return ''
  const parteEntera = Math.trunc(parseFloat(limpio) || 0)
  const enteroTexto = capitalizar(numeroATexto(parteEntera))

  const dot = limpio.indexOf('.')
  if (dot === -1) return `${enteroTexto} por ciento`
  const decStr = limpio.slice(dot + 1)
  if (!decStr || /^0+$/.test(decStr)) return `${enteroTexto} por ciento`

  let i = 0
  let prefijoCeros = ''
  while (i < decStr.length && decStr[i] === '0') {
    prefijoCeros += 'cero '
    i++
  }
  const resto = decStr.slice(i)
  const restoNum = resto ? parseInt(resto, 10) : 0
  const restoTexto = restoNum > 0 ? numeroATexto(restoNum) : ''
  const decimalTexto = `${prefijoCeros}${restoTexto}`.trim()

  return `${enteroTexto} coma ${decimalTexto} por ciento`
}

export function formatoPesos(n: number): string {
  const rounded = Math.round(n)
  const abs = Math.abs(rounded)
  const formatted = abs.toLocaleString('de-DE')
  return rounded < 0 ? `-$${formatted}` : `$${formatted}`
}

export function formatoPesosSinSigno(n: number): string {
  return Math.round(n).toLocaleString('de-DE')
}

export function montoATextoLegal(n: number): string {
  const texto = numeroATexto(n).toUpperCase()
  const formato = formatoPesosSinSigno(n)
  return `${texto} DE PESOS MONEDA CORRIENTE (COP$${formato})`
}

export function montoATextoLegalMin(n: number): string {
  const texto = capitalizar(numeroATexto(n))
  const formato = formatoPesosSinSigno(n)
  return `${texto} pesos moneda corriente (COP$${formato})`
}

export function limpiarMonto(valor: string | number | null | undefined): number {
  if (valor === null || valor === undefined || valor === '') return 0
  if (typeof valor === 'number') return Math.trunc(valor)
  const limpio = String(valor)
    .replace(/\$/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '')
    .replace(/\s/g, '')
    .trim()
  const parsed = parseInt(limpio, 10)
  return Number.isNaN(parsed) ? 0 : parsed
}

export function fechaATextoLegal(fecha: Date): string {
  // Usar zona Colombia para que la fecha legal no dependa del timezone del server.
  const { year, month, day } = colombiaDateParts(fecha)
  const diaTexto = capitalizar(numeroATexto(day))
  const anioTexto = numeroATexto(year)
  return `${diaTexto} (${day}) de ${MESES[month]} de ${anioTexto} (${year})`
}

export function plazoATexto(meses: number): string {
  const texto = capitalizar(numeroATexto(meses))
  return `${texto} (${meses}) meses`
}

export function parseFechaISO(fechaStr: string): Date {
  const [y, m, d] = fechaStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}
