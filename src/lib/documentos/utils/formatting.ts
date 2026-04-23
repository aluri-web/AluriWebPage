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

export function numeroATexto(n: number): string {
  const texto = toCardinal(Math.trunc(n))
  return texto.replace(/dieciseis/g, 'dieciséis')
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
  const dia = fecha.getDate()
  const mes = fecha.getMonth() + 1
  const anio = fecha.getFullYear()
  const diaTexto = capitalizar(numeroATexto(dia))
  const anioTexto = numeroATexto(anio)
  return `${diaTexto} (${dia}) de ${MESES[mes]} de ${anioTexto} (${anio})`
}

export function plazoATexto(meses: number): string {
  const texto = capitalizar(numeroATexto(meses))
  return `${texto} (${meses}) meses`
}

export function parseFechaISO(fechaStr: string): Date {
  const [y, m, d] = fechaStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}
