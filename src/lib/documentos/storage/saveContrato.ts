import { createClient } from '@supabase/supabase-js'
import type { ChecklistPayload } from '../types'
import { limpiarMonto } from '../utils/formatting'

const BUCKET = 'contratos-generados'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Supabase env vars no configuradas (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function slug(nombre: string): string {
  const upper = (nombre || 'sin_nombre').toUpperCase().replace(/\s+/g, '_')
  return upper.replace(/[^A-Z0-9_\-]/g, '').slice(0, 40) || 'SIN_NOMBRE'
}

function datePath(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = (d.getMonth() + 1).toString().padStart(2, '0')
  return `${y}/${m}`
}

export interface SaveContratoInput {
  payload: ChecklistPayload
  createdBy?: string | null

  docxBuffer: Buffer
  docxFilename: string

  pdfBuffer?: Buffer
  pdfFilename?: string
}

export interface SaveContratoResult {
  id: string
  docxPath: string
  pdfPath: string | null
}

/**
 * Sube el .docx (y opcionalmente el .pdf) al bucket "contratos-generados"
 * y registra la fila en public.contratos_generados. Idempotente a nivel
 * de fila: genera un nuevo UUID y un path unico por generacion.
 */
export async function saveContrato(input: SaveContratoInput): Promise<SaveContratoResult> {
  const { payload, createdBy, docxBuffer, docxFilename, pdfBuffer, pdfFilename } = input
  const admin = getAdminClient()

  const deudor = payload.deudores?.[0]
  const slugDeudor = slug(deudor?.nombre || '')
  const id = crypto.randomUUID()
  const basePath = `${datePath()}/${id}_${slugDeudor}`

  const docxPath = `${basePath}.docx`
  const pdfPath = pdfBuffer ? `${basePath}.pdf` : null

  // ── Upload DOCX ──
  const { error: upDocxErr } = await admin.storage
    .from(BUCKET)
    .upload(docxPath, docxBuffer, {
      contentType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: false,
    })
  if (upDocxErr) throw new Error(`Storage upload DOCX fallo: ${upDocxErr.message}`)

  // ── Upload PDF (opcional) ──
  if (pdfBuffer && pdfPath) {
    const { error: upPdfErr } = await admin.storage
      .from(BUCKET)
      .upload(pdfPath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      })
    if (upPdfErr) {
      // Rollback DOCX para no dejar orfandad
      await admin.storage.from(BUCKET).remove([docxPath])
      throw new Error(`Storage upload PDF fallo: ${upPdfErr.message}`)
    }
  }

  // ── Insert metadata row ──
  const montoTotal = (payload.deudores || []).reduce(
    (acc, d) => acc + limpiarMonto(d.participacion_monto),
    0
  ) || limpiarMonto(payload.prestamo?.monto || '')

  const row = {
    id,
    created_by: createdBy ?? null,
    tipo_contrato: payload.tipo_contrato || null,
    deudor_nombre: deudor?.nombre || null,
    deudor_cc: deudor?.cc || null,
    num_deudores: (payload.deudores || []).filter((d) => (d.nombre || '').trim()).length,
    num_acreedores: (payload.acreedores || []).filter((a) => (a.nombre || '').trim()).length,
    monto_total: montoTotal || null,
    plazo_meses: parseInt(payload.prestamo?.plazo_meses || '0', 10) || null,
    tasa_mensual: payload.prestamo?.tasa_mensual || null,
    cuota_mensual: limpiarMonto(payload.prestamo?.cuota_mensual || '') || null,
    comision_aluri: limpiarMonto(payload.prestamo?.comision_aluri || '') || null,
    docx_path: docxPath,
    docx_filename: docxFilename,
    docx_size_bytes: docxBuffer.length,
    pdf_path: pdfPath,
    pdf_filename: pdfFilename || null,
    pdf_size_bytes: pdfBuffer?.length || null,
    payload: payload as unknown as object,
  }

  const { error: insErr } = await admin.from('contratos_generados').insert(row)
  if (insErr) {
    // Rollback archivos
    const pathsToDelete = pdfPath ? [docxPath, pdfPath] : [docxPath]
    await admin.storage.from(BUCKET).remove(pathsToDelete)
    throw new Error(`Insert contratos_generados fallo: ${insErr.message}`)
  }

  return { id, docxPath, pdfPath }
}

/**
 * Variante que solo sube un PDF (para cuando el usuario descarga solo el
 * formulario PDF sin generar el DOCX del contrato).
 */
export async function savePdfOnly(
  payload: ChecklistPayload,
  pdfBuffer: Buffer,
  pdfFilename: string,
  createdBy: string | null
): Promise<{ id: string; pdfPath: string }> {
  const admin = getAdminClient()
  const deudor = payload.deudores?.[0]
  const slugDeudor = slug(deudor?.nombre || '')
  const id = crypto.randomUUID()
  const pdfPath = `${datePath()}/${id}_${slugDeudor}.pdf`

  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(pdfPath, pdfBuffer, { contentType: 'application/pdf', upsert: false })
  if (upErr) throw new Error(`Storage upload PDF fallo: ${upErr.message}`)

  const montoTotal = (payload.deudores || []).reduce(
    (acc, d) => acc + limpiarMonto(d.participacion_monto),
    0
  ) || limpiarMonto(payload.prestamo?.monto || '')

  const row = {
    id,
    created_by: createdBy ?? null,
    tipo_contrato: payload.tipo_contrato || null,
    deudor_nombre: deudor?.nombre || null,
    deudor_cc: deudor?.cc || null,
    num_deudores: (payload.deudores || []).filter((d) => (d.nombre || '').trim()).length,
    num_acreedores: (payload.acreedores || []).filter((a) => (a.nombre || '').trim()).length,
    monto_total: montoTotal || null,
    plazo_meses: parseInt(payload.prestamo?.plazo_meses || '0', 10) || null,
    tasa_mensual: payload.prestamo?.tasa_mensual || null,
    cuota_mensual: limpiarMonto(payload.prestamo?.cuota_mensual || '') || null,
    comision_aluri: limpiarMonto(payload.prestamo?.comision_aluri || '') || null,
    docx_path: null,
    docx_filename: null,
    docx_size_bytes: null,
    pdf_path: pdfPath,
    pdf_filename: pdfFilename,
    pdf_size_bytes: pdfBuffer.length,
    payload: payload as unknown as object,
  }

  const { error: insErr } = await admin.from('contratos_generados').insert(row)
  if (insErr) {
    await admin.storage.from(BUCKET).remove([pdfPath])
    throw new Error(`Insert contratos_generados fallo: ${insErr.message}`)
  }

  return { id, pdfPath }
}
