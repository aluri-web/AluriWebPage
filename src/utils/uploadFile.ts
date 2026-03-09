/**
 * Upload a file directly to Supabase Storage using a signed URL.
 * This bypasses Next.js body size limits by uploading directly from the browser.
 *
 * Flow:
 * 1. Request a signed upload URL from our API (small JSON request)
 * 2. Upload the file directly to Supabase Storage (bypasses Next.js)
 */
export async function uploadFile(
  file: File,
  loanCode: string = 'default'
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Step 1: Get signed upload URL from our API
    const signedRes = await fetch('/api/upload/signed-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
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
        'Content-Type': file.type,
      },
      body: file,
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
