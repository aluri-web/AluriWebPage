import { PDFDocument } from 'pdf-lib'

const MAX_PDF_PAGES = 5
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB Supabase limit

/**
 * Trim a PDF to the first N pages if it exceeds the size limit.
 * Returns a new File with fewer pages, or the original if small enough.
 */
async function trimPdfIfNeeded(file: File): Promise<File> {
  if (file.type !== 'application/pdf' || file.size <= MAX_FILE_SIZE) {
    return file
  }

  try {
    const buffer = await file.arrayBuffer()
    const pdf = await PDFDocument.load(buffer)
    const totalPages = pdf.getPageCount()

    if (totalPages <= MAX_PDF_PAGES) {
      return file // Can't trim further
    }

    // Create new PDF with only first N pages
    const trimmed = await PDFDocument.create()
    const pages = await trimmed.copyPages(pdf, Array.from({ length: MAX_PDF_PAGES }, (_, i) => i))
    for (const page of pages) {
      trimmed.addPage(page)
    }

    const trimmedBytes = await trimmed.save()
    const trimmedFile = new File(
      [trimmedBytes],
      file.name,
      { type: 'application/pdf' }
    )

    console.log(`[upload] Trimmed PDF from ${totalPages} pages (${(file.size / 1024 / 1024).toFixed(1)}MB) to ${MAX_PDF_PAGES} pages (${(trimmedFile.size / 1024 / 1024).toFixed(1)}MB)`)
    return trimmedFile
  } catch (error) {
    console.error('[upload] Failed to trim PDF, uploading original:', error)
    return file
  }
}

/**
 * Upload a file directly to Supabase Storage using a signed URL.
 * This bypasses Next.js body size limits by uploading directly from the browser.
 *
 * For large PDFs (>50MB), automatically trims to first 5 pages.
 *
 * Flow:
 * 1. Trim PDF if too large
 * 2. Request a signed upload URL from our API (small JSON request)
 * 3. Upload the file directly to Supabase Storage (bypasses Next.js)
 */
export async function uploadFile(
  file: File,
  loanCode: string = 'default'
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Step 0: Trim large PDFs to first 5 pages
    const fileToUpload = await trimPdfIfNeeded(file)

    // Step 1: Get signed upload URL from our API
    const signedRes = await fetch('/api/upload/signed-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: fileToUpload.name,
        fileType: fileToUpload.type,
        fileSize: fileToUpload.size,
        loanCode,
      }),
    })

    const signedData = await signedRes.json()
    if (!signedRes.ok || !signedData.signedUrl) {
      return { success: false, error: signedData.error || 'Error al preparar subida' }
    }

    // Step 2: Upload directly to Supabase Storage using the signed URL
    const uploadRes = await fetch(signedData.signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': fileToUpload.type,
      },
      body: fileToUpload,
    })

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text().catch(() => '')
      console.error('Direct upload failed:', uploadRes.status, errorText)
      return { success: false, error: 'Error al subir archivo a storage' }
    }

    return { success: true, url: signedData.publicUrl }
  } catch (error) {
    console.error('Upload error:', error)
    return { success: false, error: 'Error al subir archivo' }
  }
}

/**
 * Delete a file from Supabase Storage via our API route.
 */
export async function deleteFile(url: string): Promise<void> {
  try {
    await fetch('/api/upload', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
  } catch {
    // Ignore delete errors
  }
}
