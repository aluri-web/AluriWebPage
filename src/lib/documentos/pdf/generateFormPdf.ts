import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ChecklistPayload } from '../types'
import { colombiaDateParts } from '../utils/formatting'

type RGB = [number, number, number]

const NAVY: RGB = [26, 58, 92]
const LIGHT_GREY: RGB = [244, 246, 249]
const GREY_500: RGB = [107, 114, 128]
const GREY_700: RGB = [55, 65, 81]
const GREY_200: RGB = [229, 231, 235]

interface Campo {
  label: string
  value: string
}

function seccion(doc: jsPDF, titulo: string, startY: number): number {
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 14
  const width = pageWidth - margin * 2
  const height = 9

  doc.setFillColor(...NAVY)
  doc.rect(margin, startY, width, height, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(titulo, margin + 4, startY + 6.2)

  return startY + height
}

function campos(doc: jsPDF, items: Campo[], startY: number): number {
  autoTable(doc, {
    startY,
    body: items.map((c) => [c.label, c.value || '-']),
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 2.5,
      textColor: GREY_700,
      lineColor: GREY_200,
      lineWidth: 0.2,
      valign: 'top',
    },
    columnStyles: {
      0: {
        cellWidth: 55,
        fillColor: LIGHT_GREY,
        fontStyle: 'bold',
        textColor: GREY_500,
      },
      1: { cellWidth: 'auto' },
    },
    margin: { left: 14, right: 14 },
  })
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
  return finalY + 6
}

export function generateFormPdf(form: ChecklistPayload): Buffer {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' })

  const pageWidth = doc.internal.pageSize.getWidth()

  // ── Titulo ──
  doc.setTextColor(...GREY_700)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('FORMULARIO DE SOLICITUD', pageWidth / 2, 18, { align: 'center' })

  doc.setTextColor(...GREY_500)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Check List - Informacion Requerida', pageWidth / 2, 24, { align: 'center' })

  let y = 32

  // ── Tipo contrato ──
  y = seccion(doc, 'TIPO DE CONTRATO', y)
  y = campos(doc, [{ label: 'Tipo de contrato', value: form.tipo_contrato || '' }], y)

  // ── Deudores ──
  const deudores = form.deudores || []
  deudores.forEach((d, i) => {
    const label = i === 0 ? 'INFORMACION DEL DEUDOR PRINCIPAL' : `INFORMACION DEL DEUDOR ${i + 1}`
    y = seccion(doc, label, y)
    y = campos(doc, [
      { label: 'Nombre', value: d.nombre },
      { label: 'Tipo de documento', value: d.tipo_documento || 'C.C.' },
      { label: 'No. documento', value: d.cc },
      { label: 'Expedido en', value: d.cc_expedicion },
      { label: 'Direccion', value: d.direccion },
      { label: 'Correo', value: d.email },
      { label: 'Telefono', value: d.telefono },
      { label: 'Estado civil', value: d.estado_civil },
      { label: 'Participacion $', value: d.participacion_monto },
      { label: 'Participacion %', value: d.participacion_porcentaje },
      { label: 'Tipo de cuenta', value: d.tipo_cuenta || 'Ahorros' },
      { label: 'No. cuenta', value: d.numero_cuenta },
    ], y)
  })

  // ── Codeudores ──
  const codeudores = form.codeudores || []
  codeudores.forEach((c, i) => {
    y = seccion(doc, `INFORMACION DEL CODEUDOR ${i + 1}`, y)
    y = campos(doc, [
      { label: 'Nombre', value: c.nombre },
      { label: 'Tipo de documento', value: c.tipo_documento || 'C.C.' },
      { label: 'No. documento', value: c.cc },
      { label: 'Expedido en', value: c.cc_expedicion },
      { label: 'Direccion', value: c.direccion },
      { label: 'Correo', value: c.email },
      { label: 'Telefono', value: c.telefono },
      { label: 'Estado civil', value: c.estado_civil },
      { label: 'Tipo de cuenta', value: c.tipo_cuenta || 'Ahorros' },
      { label: 'No. cuenta', value: c.numero_cuenta },
    ], y)
  })

  // ── Acreedores ──
  const acreedores = form.acreedores || []
  acreedores.forEach((a, i) => {
    y = seccion(doc, `INFORMACION DEL ACREEDOR ${i + 1}`, y)
    y = campos(doc, [
      { label: 'Nombre', value: a.nombre },
      { label: 'Tipo de documento', value: a.tipo_documento || 'C.C.' },
      { label: 'No. documento', value: a.cc },
      { label: 'Expedido en', value: a.cc_expedicion },
      { label: 'Direccion', value: a.direccion },
      { label: 'Correo', value: a.email },
      { label: 'Telefono', value: a.telefono },
      { label: 'Estado civil', value: a.estado_civil },
      { label: 'Participacion $', value: a.participacion_monto },
      { label: 'Participacion %', value: a.participacion_porcentaje },
      { label: 'Tipo de cuenta', value: a.tipo_cuenta || 'Ahorros' },
      { label: 'No. cuenta', value: a.numero_cuenta },
    ], y)
  })

  // ── Inmueble ──
  const inm = form.inmueble || {
    matricula_inmobiliaria: '',
    cedula_catastral: '',
    chip: '',
    direccion: '',
    ciudad: '',
    oficina_registro: '',
    ciudad_oficina_registro: '',
    descripcion: '',
    linderos: '',
  }
  y = seccion(doc, 'INFORMACION DEL INMUEBLE', y)
  y = campos(doc, [
    { label: 'Matricula inmobiliaria', value: inm.matricula_inmobiliaria },
    { label: 'Cedula catastral', value: inm.cedula_catastral },
    { label: 'Codigo CHIP', value: inm.chip },
    { label: 'Direccion', value: inm.direccion },
    { label: 'Ciudad', value: inm.ciudad },
    { label: 'Oficina de Registro', value: inm.oficina_registro },
    { label: 'Ciudad oficina', value: inm.ciudad_oficina_registro },
    { label: 'Descripcion', value: inm.descripcion },
    { label: 'Linderos', value: inm.linderos },
  ], y)

  // ── Prestamo ──
  const p = form.prestamo || {
    monto: '',
    plazo_meses: '',
    tasa_mensual: '',
    cuota_mensual: '',
    forma_pago: '' as const,
    comision_aluri: '',
    observaciones: '',
  }
  y = seccion(doc, 'CONDICIONES DEL PRESTAMO', y)
  y = campos(doc, [
    { label: 'Monto del prestamo', value: p.monto },
    { label: 'Plazo (meses)', value: p.plazo_meses },
    { label: 'Tasa mensual', value: p.tasa_mensual },
    { label: 'Cuota mensual', value: p.cuota_mensual },
    { label: 'Forma de pago', value: p.forma_pago },
    { label: 'Comision Aluri', value: p.comision_aluri },
    { label: 'Observaciones', value: p.observaciones },
  ], y)

  // Pie de pagina
  const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setTextColor(...GREY_500)
    doc.setFontSize(8)
    doc.text(
      `${new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })} · Pagina ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    )
  }

  const ab = doc.output('arraybuffer')
  return Buffer.from(new Uint8Array(ab))
}

export function pdfFilename(form: ChecklistPayload, today: Date = new Date()): string {
  const primerDeudor = form.deudores?.[0]?.nombre || 'SIN_NOMBRE'
  const upper = primerDeudor.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_\-]/g, '')
  const nombre = (upper || 'SIN_NOMBRE').slice(0, 30)
  const pad = (n: number) => n.toString().padStart(2, '0')
  const c = colombiaDateParts(today)
  const ts = `${c.year}${pad(c.month)}${pad(c.day)}_${pad(c.hour)}${pad(c.minute)}${pad(c.second)}`
  return `Formulario_${nombre}_${ts}.pdf`
}
