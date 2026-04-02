// No PDF trimming — Supabase Pro supports large files.
// The titulo agent handles page limits internally (max_pages=5 in OCR).

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
    const fileToUpload = file

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
